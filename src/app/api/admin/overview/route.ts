import { NextResponse } from "next/server";
import { ensureAdminUser } from "@/lib/auth/current-user";
import { apiError } from "@/lib/api/http";
import { getPrisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    await ensureAdminUser();
    const prisma = getPrisma();

    const startLatency = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatencyMs = Date.now() - startLatency;

    const [
      totalUsers,
      totalTasks,
      completedTasks,
      totalProjects,
      totalComments,
      totalActivities,
      users,
      systemSettings,
      recentActivities,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.task.count({ where: { deletedAt: null } }),
      prisma.task.count({ where: { status: "DONE", deletedAt: null } }),
      prisma.project.count({ where: { isArchived: false } }),
      prisma.taskComment.count(),
      prisma.activityLog.count(),
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
          createdAt: true,
          _count: {
            select: {
              tasks: true,
              projects: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.systemSetting.findMany(),
      prisma.activityLog.findMany({
        take: 12,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true } },
          task: { select: { id: true, title: true } },
        },
      }),
    ]);

    const settingsMap: Record<string, string> = {};
    systemSettings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    return NextResponse.json({
      metrics: {
        totalUsers,
        totalTasks,
        completedTasks,
        totalProjects,
        totalComments,
        totalActivities,
        dbLatencyMs,
      },
      settings: {
        announcement: settingsMap.announcement || "",
        announcementType: settingsMap.announcement_type || "info",
        maintenanceMode: settingsMap.maintenance_mode === "true",
      },
      users,
      recentActivities,
    });
  } catch (error) {
    return apiError(error);
  }
}
