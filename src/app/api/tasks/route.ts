import { NextRequest, NextResponse } from "next/server";
import { ensureCurrentUser } from "@/lib/auth/current-user";
import { apiError, badRequest } from "@/lib/api/http";
import { taskCreateSchema } from "@/lib/api/validation";
import { getPrisma } from "@/lib/db/prisma";
import { buildTaskWhereFromSearchParams, runAutoArchive, taskInclude } from "@/lib/db/tasks";

async function validateAssignedUser(assignedToId: string | null | undefined) {
  if (!assignedToId) return true;
  const user = await getPrisma().user.findUnique({ where: { id: assignedToId }, select: { id: true } });
  return Boolean(user);
}

export async function GET(req: NextRequest) {
  try {
    const user = await ensureCurrentUser();
    await runAutoArchive(user.id);
    const prisma = getPrisma();
    const where = buildTaskWhereFromSearchParams(user.id, req.nextUrl.searchParams);

    const tasks = await prisma.task.findMany({ where, include: taskInclude, orderBy: [{ status: "asc" }, { position: "asc" }, { createdAt: "desc" }] });
    return NextResponse.json({ tasks });
  } catch (error) { return apiError(error); }
}

export async function POST(req: NextRequest) {
  try {
    const user = await ensureCurrentUser();
    const parsed = taskCreateSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Geçersiz görev verisi");
    const data = parsed.data;
    const prisma = getPrisma();

    if (data.projectId) {
      const project = await prisma.project.findFirst({ where: { id: data.projectId, userId: user.id, isArchived: false }, select: { id: true } });
      if (!project) return badRequest("Proje bulunamadı");
    }
    if (!(await validateAssignedUser(data.assignedToId))) return badRequest("Atanacak kullanıcı bulunamadı");
    if (data.tagIds?.length) {
      const count = await prisma.tag.count({ where: { userId: user.id, id: { in: data.tagIds } } });
      if (count !== new Set(data.tagIds).size) return badRequest("Geçersiz etiket seçimi");
    }

    const task = await prisma.task.create({
      data: {
        userId: user.id,
        title: data.title,
        description: data.description ?? null,
        status: data.status ?? "TODO",
        priority: data.priority ?? "NORMAL",
        assignedToId: data.assignedToId ?? null,
        approvalStatus: data.approvalStatus ?? "NOT_REQUIRED",
        approvalNote: data.approvalNote ?? null,
        recurrenceFrequency: data.recurrenceFrequency ?? "NONE",
        recurrenceInterval: data.recurrenceInterval ?? 1,
        projectId: data.projectId ?? null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        completedAt: data.status === "DONE" ? new Date() : null,
        position: Date.now(),
        taskTags: data.tagIds?.length ? { create: [...new Set(data.tagIds)].map((tagId) => ({ userId: user.id, tagId })) } : undefined,
      },
      include: taskInclude,
    });

    try {
      const { logActivity } = await import("@/lib/notifications");
      await logActivity({
        userId: user.id,
        taskId: task.id,
        action: "TASK_CREATED",
        details: `"${task.title}" görevi oluşturuldu.`,
      });
    } catch (err) {
      console.error("Failed to log task activity:", err);
    }

    if (data.priority === "HIGH" || data.priority === "CRITICAL") {
      try {
        const { createNotification } = await import("@/lib/notifications");
        await createNotification({
          userId: user.id,
          taskId: task.id,
          type: "TASK",
          title: `⚡ Yeni ${data.priority === "CRITICAL" ? "Kritik" : "Yüksek"} Öncelikli Görev: ${task.title}`,
          body: "Önemli dikkat gerektiren bir görev oluşturuldu.",
        });
      } catch (err) {
        console.error("Failed to create priority notification:", err);
      }
    }

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) { return apiError(error); }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await ensureCurrentUser();
    const prisma = getPrisma();
    if (req.nextUrl.searchParams.get("emptyTrash") === "true") {
      await prisma.task.deleteMany({
        where: { userId: user.id, deletedAt: { not: null } },
      });
      return NextResponse.json({ success: true, message: "Çöp kutusu boşaltıldı" });
    }
    return badRequest("Geçersiz silme isteği");
  } catch (error) {
    return apiError(error);
  }
}
