import { getPrisma } from "@/lib/db/prisma";

export const taskInclude = {
  project: { select: { id: true, name: true, color: true } },
  taskTags: { include: { tag: { select: { id: true, name: true, color: true } } } },
  subtasks: { orderBy: { position: "asc" as const } },
  comments: { orderBy: { createdAt: "desc" as const }, take: 20 },
};

export async function runAutoArchive(userId: string) {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { autoArchiveCompleted: true, autoArchiveDays: true } });
  if (!user?.autoArchiveCompleted) return;
  const cutoff = new Date(Date.now() - user.autoArchiveDays * 86400000);
  await prisma.task.updateMany({
    where: { userId, status: "DONE", archivedAt: null, completedAt: { lte: cutoff } },
    data: { archivedAt: new Date() },
  });
}

export async function runGlobalAutoArchive() {
  const prisma = getPrisma();
  const users = await prisma.user.findMany({
    where: { autoArchiveCompleted: true },
    select: { id: true, autoArchiveDays: true },
  });

  let totalArchived = 0;
  for (const user of users) {
    const cutoff = new Date(Date.now() - user.autoArchiveDays * 86400000);
    const result = await prisma.task.updateMany({
      where: { userId: user.id, status: "DONE", archivedAt: null, completedAt: { lte: cutoff } },
      data: { archivedAt: new Date() },
    });
    totalArchived += result.count;
  }
  return totalArchived;
}

