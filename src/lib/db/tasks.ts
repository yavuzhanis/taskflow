import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db/prisma";

export const taskInclude = {
  project: { select: { id: true, name: true, color: true, completionEmailTo: true } },
  assignedTo: { select: { id: true, name: true, email: true, avatarUrl: true } },
  approvedBy: { select: { id: true, name: true, email: true } },
  taskTags: { include: { tag: { select: { id: true, name: true, color: true } } } },
  subtasks: { orderBy: { position: "asc" } },
  comments: { orderBy: { createdAt: "desc" }, take: 20 },
  attachments: { orderBy: { createdAt: "desc" } },
  mailDeliveries: { orderBy: { createdAt: "desc" }, take: 10 },
} as const;

type GlobalAutoArchiveOptions = {
  force?: boolean;
};

type TaskWhereOptions = {
  defaultLifecycle?: "active" | "all";
};

export function dayBounds(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function buildTaskWhereFromSearchParams(
  userId: string,
  params: URLSearchParams,
  options: TaskWhereOptions = {},
) {
  const isTrash = params.get("trash") === "true";
  const isArchived = !isTrash && params.get("archived") === "true";
  const where: Prisma.TaskWhereInput = { userId };

  if (isTrash) {
    where.deletedAt = { not: null };
  } else if (isArchived) {
    where.deletedAt = null;
    where.archivedAt = { not: null };
  } else if ((options.defaultLifecycle ?? "active") === "active") {
    where.deletedAt = null;
    where.archivedAt = null;
  }

  const status = params.get("status");
  if (status === "TODO" || status === "IN_PROGRESS" || status === "DONE") {
    where.status = status;
  }

  const projectId = params.get("projectId");
  if (projectId) {
    where.projectId = projectId;
  }

  const tagId = params.get("tagId");
  if (tagId) {
    where.taskTags = { some: { userId, tagId } };
  }

  const query = params.get("q")?.trim();
  if (query) {
    where.OR = [
      { title: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
    ];
  }

  const smart = params.get("smart");
  const now = new Date();
  if (smart === "today") {
    const { start, end } = dayBounds(now);
    where.dueDate = { gte: start, lte: end };
  } else if (smart === "week") {
    const { start } = dayBounds(now);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    end.setHours(23, 59, 59, 999);
    where.dueDate = { gte: start, lte: end };
  } else if (smart === "overdue") {
    const { start } = dayBounds(now);
    where.dueDate = { lt: start };
    where.status = { not: "DONE" };
  }

  return where;
}

export function taskOrderByForSort(
  sort: string | null,
): Prisma.TaskOrderByWithRelationInput[] {
  const fallback: Prisma.TaskOrderByWithRelationInput[] = [
    { status: "asc" },
    { position: "asc" },
    { createdAt: "desc" },
  ];

  if (sort === "due") {
    return [
      { dueDate: { sort: "asc", nulls: "last" } },
      { createdAt: "desc" },
    ];
  }

  if (sort === "priority") {
    return [{ priority: "desc" }, { createdAt: "desc" }];
  }

  if (sort === "title") {
    return [{ title: "asc" }];
  }

  if (sort === "status") {
    return [{ status: "asc" }, { createdAt: "desc" }];
  }

  return fallback;
}

function completedArchiveWhere(cutoff?: Date): Prisma.TaskWhereInput {
  const base: Prisma.TaskWhereInput = {
    status: "DONE",
    archivedAt: null,
    deletedAt: null,
  };

  if (!cutoff) {
    return base;
  }

  return {
    ...base,
    OR: [
      { completedAt: { lte: cutoff } },
      { completedAt: null, updatedAt: { lte: cutoff } },
    ],
  };
}

export async function runAutoArchive(userId: string) {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { autoArchiveCompleted: true, autoArchiveDays: true } });
  if (!user?.autoArchiveCompleted) return;
  const cutoff = new Date(Date.now() - user.autoArchiveDays * 86400000);
  await prisma.task.updateMany({
    where: { userId, ...completedArchiveWhere(cutoff) },
    data: { archivedAt: new Date() },
  });
}

export async function runGlobalAutoArchive(options: GlobalAutoArchiveOptions = {}) {
  const prisma = getPrisma();
  const archivedAt = new Date();

  if (options.force) {
    const result = await prisma.task.updateMany({
      where: completedArchiveWhere(),
      data: { archivedAt },
    });

    return result.count;
  }

  const users = await prisma.user.findMany({
    where: { autoArchiveCompleted: true },
    select: { id: true, autoArchiveDays: true },
  });

  let totalArchived = 0;
  for (const user of users) {
    const cutoff = new Date(Date.now() - user.autoArchiveDays * 86400000);
    const result = await prisma.task.updateMany({
      where: { userId: user.id, ...completedArchiveWhere(cutoff) },
      data: { archivedAt },
    });
    totalArchived += result.count;
  }
  return totalArchived;
}
