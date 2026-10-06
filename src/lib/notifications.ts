import { getPrisma } from "@/lib/db/prisma";

export type NotificationType = "DEADLINE" | "TASK" | "SYSTEM";

export async function createNotification({
  userId,
  taskId,
  type = "SYSTEM",
  title,
  body,
}: {
  userId: string;
  taskId?: string;
  type?: NotificationType;
  title: string;
  body?: string;
}) {
  const prisma = getPrisma();
  return prisma.notification.create({
    data: {
      userId,
      taskId: taskId ?? null,
      type,
      title,
      body: body ?? null,
    },
  });
}

export async function logActivity({
  userId,
  taskId,
  action,
  details,
}: {
  userId: string;
  taskId?: string;
  action: string;
  details?: string;
}) {
  const prisma = getPrisma();
  return prisma.activityLog.create({
    data: {
      userId,
      taskId: taskId ?? null,
      action,
      details: details ?? null,
    },
  });
}

/**
 * Automaticaly synchronizes deadline notifications for tasks
 * that are due soon (next 24 hours) or overdue.
 */
export async function syncTaskDeadlineNotifications(userId: string) {
  const prisma = getPrisma();
  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Find active tasks due in <= 24 hours or overdue
  const tasksDue = await prisma.task.findMany({
    where: {
      userId,
      status: { not: "DONE" },
      archivedAt: null,
      dueDate: {
        lte: in24Hours,
      },
    },
    select: {
      id: true,
      title: true,
      dueDate: true,
      priority: true,
    },
    take: 30,
  });

  if (!tasksDue.length) return;

  // Check which tasks already have an active deadline notification created in the last 24 hours
  const recentCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const existingNotifications = await prisma.notification.findMany({
    where: {
      userId,
      taskId: { in: tasksDue.map((t) => t.id) },
      type: "DEADLINE",
      createdAt: { gte: recentCutoff },
    },
    select: { taskId: true },
  });

  const existingTaskIds = new Set(existingNotifications.map((n) => n.taskId).filter(Boolean));

  for (const task of tasksDue) {
    if (existingTaskIds.has(task.id) || !task.dueDate) continue;

    const isOverdue = task.dueDate < now;
    const title = isOverdue
      ? `⚠️ Gecikmiş Görev: ${task.title}`
      : `⏳ Yaklaşan Teslim Tarihi: ${task.title}`;
    const body = isOverdue
      ? `Bu görevin son teslim tarihi (${new Date(task.dueDate).toLocaleDateString("tr-TR")}) geçti.`
      : `Görevin son teslim tarihine 24 saatten az süre kaldı.`;

    await createNotification({
      userId,
      taskId: task.id,
      type: "DEADLINE",
      title,
      body,
    });
  }
}
