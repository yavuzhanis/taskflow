import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { ensureCurrentUser } from "@/lib/auth/current-user";
import { apiError, badRequest } from "@/lib/api/http";
import { taskCreateSchema } from "@/lib/api/validation";
import { getPrisma } from "@/lib/db/prisma";
import { runAutoArchive, taskInclude } from "@/lib/db/tasks";

function dayBounds(date: Date) {
  const start = new Date(date); start.setHours(0, 0, 0, 0);
  const end = new Date(date); end.setHours(23, 59, 59, 999);
  return { start, end };
}

export async function GET(req: NextRequest) {
  try {
    const user = await ensureCurrentUser();
    await runAutoArchive(user.id);
    const prisma = getPrisma();
    const p = req.nextUrl.searchParams;
    const isTrash = p.get("trash") === "true";
    const where: Prisma.TaskWhereInput = {
      userId: user.id,
      deletedAt: isTrash ? { not: null } : null,
      archivedAt: !isTrash && p.get("archived") === "true" ? { not: null } : null,
    };

    const status = p.get("status");
    if (status === "TODO" || status === "IN_PROGRESS" || status === "DONE") where.status = status;
    if (p.get("projectId")) where.projectId = p.get("projectId");
    if (p.get("tagId")) where.taskTags = { some: { userId: user.id, tagId: p.get("tagId")! } };
    const q = p.get("q")?.trim();
    if (q) where.OR = [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }];

    const smart = p.get("smart");
    const now = new Date();
    if (smart === "today") {
      const { start, end } = dayBounds(now);
      where.dueDate = { gte: start, lte: end };
    } else if (smart === "week") {
      const { start } = dayBounds(now);
      const end = new Date(start); end.setDate(end.getDate() + 7); end.setHours(23, 59, 59, 999);
      where.dueDate = { gte: start, lte: end };
    } else if (smart === "overdue") {
      const { start } = dayBounds(now);
      where.dueDate = { lt: start };
      where.status = { not: "DONE" };
    }

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
