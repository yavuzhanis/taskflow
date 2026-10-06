import { NextResponse } from "next/server";
import { ensureCurrentUser } from "@/lib/auth/current-user";
import { apiError } from "@/lib/api/http";
import { getPrisma } from "@/lib/db/prisma";
import { runAutoArchive, taskInclude } from "@/lib/db/tasks";

export async function GET() {
  try {
    const user = await ensureCurrentUser();
    await runAutoArchive(user.id);
    const prisma = getPrisma();

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const weekEnd = new Date(todayEnd);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // 7 days ago
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [
      open,
      inProgress,
      completedToday,
      dueThisWeek,
      dueTodayOpen,
      upcoming,
      activities,
      completedTasks7Days,
      createdTasks7Days,
    ] = await Promise.all([
      prisma.task.count({ where: { userId: user.id, archivedAt: null, deletedAt: null, status: { not: "DONE" } } }),
      prisma.task.count({ where: { userId: user.id, archivedAt: null, deletedAt: null, status: "IN_PROGRESS" } }),
      prisma.task.count({ where: { userId: user.id, deletedAt: null, completedAt: { gte: todayStart, lte: todayEnd } } }),
      prisma.task.count({ where: { userId: user.id, archivedAt: null, deletedAt: null, dueDate: { gte: todayStart, lte: weekEnd }, status: { not: "DONE" } } }),
      prisma.task.count({ where: { userId: user.id, archivedAt: null, deletedAt: null, dueDate: { gte: todayStart, lte: todayEnd }, status: { not: "DONE" } } }),
      prisma.task.findMany({
        where: { userId: user.id, archivedAt: null, deletedAt: null, status: { not: "DONE" }, dueDate: { not: null } },
        include: taskInclude,
        orderBy: { dueDate: "asc" },
        take: 6,
      }),
      prisma.activityLog.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          task: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
            },
          },
        },
      }),
      prisma.task.findMany({
        where: {
          userId: user.id,
          deletedAt: null,
          completedAt: { gte: sevenDaysAgo },
        },
        select: { completedAt: true },
      }),
      prisma.task.findMany({
        where: {
          userId: user.id,
          deletedAt: null,
          createdAt: { gte: sevenDaysAgo },
        },
        select: { createdAt: true },
      }),
    ]);

    const completionRate =
      dueTodayOpen + completedToday === 0
        ? 0
        : Math.round((completedToday / (dueTodayOpen + completedToday)) * 100);

    const dayNames = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
    const weeklyTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const dateKey = `${yyyy}-${mm}-${dd}`;
      const dayLabel = i === 0 ? "Bugün" : dayNames[d.getDay()];

      const dStart = new Date(d);
      dStart.setHours(0, 0, 0, 0);
      const dEnd = new Date(d);
      dEnd.setHours(23, 59, 59, 999);

      const completed = completedTasks7Days.filter(
        (t) => t.completedAt && t.completedAt >= dStart && t.completedAt <= dEnd
      ).length;

      const created = createdTasks7Days.filter(
        (t) => t.createdAt >= dStart && t.createdAt <= dEnd
      ).length;

      weeklyTrend.push({
        date: dateKey,
        dayLabel,
        completed,
        created,
      });
    }

    return NextResponse.json({
      stats: {
        open,
        inProgress,
        completedToday,
        dueThisWeek,
        completionRate,
      },
      upcoming,
      activities,
      weeklyTrend,
    });
  } catch (error) {
    return apiError(error);
  }
}

