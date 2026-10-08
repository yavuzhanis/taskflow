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
      pendingApprovals,
      recurringTasks,
      attachmentCount,
      sentMailDeliveries,
      failedMailDeliveries,
      overdueTasks,
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
      prisma.task.count({ where: { approvalStatus: "PENDING", deletedAt: null } }),
      prisma.task.count({ where: { recurrenceFrequency: { not: "NONE" }, deletedAt: null } }),
      prisma.taskAttachment.count(),
      prisma.mailDelivery.count({ where: { status: "SENT" } }),
      prisma.mailDelivery.count({ where: { status: "FAILED" } }),
      prisma.task.count({
        where: {
          status: { not: "DONE" },
          dueDate: { lt: new Date() },
          deletedAt: null,
        },
      }),
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
        pendingApprovals,
        recurringTasks,
        attachmentCount,
        sentMailDeliveries,
        failedMailDeliveries,
        overdueTasks,
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
