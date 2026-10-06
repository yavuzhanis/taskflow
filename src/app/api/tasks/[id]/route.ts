import { NextRequest, NextResponse } from "next/server";
import { ensureCurrentUser } from "@/lib/auth/current-user";
import { apiError, badRequest } from "@/lib/api/http";
import { taskUpdateSchema } from "@/lib/api/validation";
import { getPrisma } from "@/lib/db/prisma";
import { taskInclude } from "@/lib/db/tasks";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await ensureCurrentUser();
    const { id } = await params;
    const task = await getPrisma().task.findFirst({ where: { id, userId: user.id }, include: taskInclude });
    if (!task) return NextResponse.json({ error: "Görev bulunamadı" }, { status: 404 });
    return NextResponse.json({ task });
  } catch (error) { return apiError(error); }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await ensureCurrentUser();
    const { id } = await params;
    const parsed = taskUpdateSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Geçersiz görev verisi");
    const prisma = getPrisma();
    const existing = await prisma.task.findFirst({ where: { id, userId: user.id }, select: { id: true, status: true } });
    if (!existing) return NextResponse.json({ error: "Görev bulunamadı" }, { status: 404 });
    const data = parsed.data;

    if (data.projectId) {
      const project = await prisma.project.findFirst({ where: { id: data.projectId, userId: user.id, isArchived: false }, select: { id: true } });
      if (!project) return badRequest("Proje bulunamadı");
    }
    if (data.tagIds) {
      const unique = [...new Set(data.tagIds)];
      const count = await prisma.tag.count({ where: { userId: user.id, id: { in: unique } } });
      if (count !== unique.length) return badRequest("Geçersiz etiket seçimi");
      await prisma.taskTag.deleteMany({ where: { taskId: id, userId: user.id } });
      if (unique.length) await prisma.taskTag.createMany({ data: unique.map((tagId) => ({ userId: user.id, taskId: id, tagId })), skipDuplicates: true });
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        projectId: data.projectId,
        dueDate: data.dueDate === undefined ? undefined : data.dueDate ? new Date(data.dueDate) : null,
        position: data.position,
        archivedAt: data.archived === undefined ? undefined : data.archived ? new Date() : null,
        deletedAt: data.restore === true ? null : undefined,
        completedAt: data.status === undefined ? undefined : data.status === "DONE" ? (existing.status === "DONE" ? undefined : new Date()) : null,
      },
      include: taskInclude,
    });

    if (data.status === "DONE" && existing.status !== "DONE") {
      try {
        const { createNotification, logActivity } = await import("@/lib/notifications");
        await Promise.all([
          createNotification({
            userId: user.id,
            taskId: id,
            type: "TASK",
            title: `🎉 Görev Tamamlandı: ${task.title}`,
            body: "Tebrikler, bu görevi başarıyla tamamladın!",
          }),
          logActivity({
            userId: user.id,
            taskId: id,
            action: "TASK_COMPLETED",
            details: `"${task.title}" görevi tamamlandı olarak işaretlendi.`,
          }),
        ]);
      } catch (err) {
        console.error("Failed to create completion notification / activity:", err);
      }
    } else if (existing.status === "DONE" && data.status && data.status !== "DONE") {
      try {
        const { logActivity } = await import("@/lib/notifications");
        await logActivity({
          userId: user.id,
          taskId: id,
          action: "TASK_REOPENED",
          details: `"${task.title}" görevi yeniden açıldı.`,
        });
      } catch (err) {
        console.error("Failed to log task reopened activity:", err);
      }
    } else if (data.restore === true) {
      try {
        const { logActivity } = await import("@/lib/notifications");
        await logActivity({
          userId: user.id,
          taskId: id,
          action: "TASK_RESTORED",
          details: `"${task.title}" çöp kutusundan geri yüklendi.`,
        });
      } catch (err) {
        console.error("Failed to log task restored activity:", err);
      }
    }

    return NextResponse.json({ task });
  } catch (error) { return apiError(error); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await ensureCurrentUser();
    const { id } = await params;
    const prisma = getPrisma();
    const isPermanent = req.nextUrl.searchParams.get("permanent") === "true";

    if (isPermanent) {
      const existing = await prisma.task.findFirst({ where: { id, userId: user.id }, select: { title: true } });
      const result = await prisma.task.deleteMany({ where: { id, userId: user.id } });
      if (!result.count) return NextResponse.json({ error: "Görev bulunamadı" }, { status: 404 });
      try {
        const { logActivity } = await import("@/lib/notifications");
        await logActivity({
          userId: user.id,
          action: "TASK_DELETED",
          details: `"${existing?.title ?? id}" kalıcı olarak silindi.`,
        });
      } catch {}
      return NextResponse.json({ ok: true, permanent: true });
    }

    const existing = await prisma.task.findFirst({ where: { id, userId: user.id }, select: { title: true } });
    const result = await prisma.task.updateMany({
      where: { id, userId: user.id },
      data: { deletedAt: new Date() },
    });
    if (!result.count) return NextResponse.json({ error: "Görev bulunamadı" }, { status: 404 });
    try {
      const { logActivity } = await import("@/lib/notifications");
      await logActivity({
        userId: user.id,
        taskId: id,
        action: "TASK_TRASHED",
        details: `"${existing?.title ?? id}" çöp kutusuna taşındı.`,
      });
    } catch {}
    return NextResponse.json({ ok: true, trashed: true });
  } catch (error) { return apiError(error); }
}
