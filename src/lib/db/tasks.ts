import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db/prisma";

export const taskInclude = {
  project: { select: { id: true, name: true, color: true, completionEmailTo: true } },
  assignedTo: { select: { id: true, name: true, email: true, avatarUrl: true } },
  approvedBy: { select: { id: true, name: true, email: true } },
  taskTags: { include: { tag: { select: { id: true, name: true, color: true } } } },
  subtasks: { orderBy: { position: "asc" as const } },
  comments: { orderBy: { createdAt: "desc" as const }, take: 20 },
  attachments: { orderBy: { createdAt: "desc" as const } },
  mailDeliveries: { orderBy: { createdAt: "desc" as const }, take: 10 },
};

type GlobalAutoArchiveOptions = {
  force?: boolean;
};

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
