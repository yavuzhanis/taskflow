import { NextRequest, NextResponse } from "next/server";
import { ensureCurrentUser } from "@/lib/auth/current-user";
import { apiError, badRequest } from "@/lib/api/http";
import { getPrisma } from "@/lib/db/prisma";
import { syncTaskDeadlineNotifications, createNotification } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  try {
    const user = await ensureCurrentUser();
    const prisma = getPrisma();

    // Auto-sync upcoming deadline notifications
    try {
      await syncTaskDeadlineNotifications(user.id);
    } catch (e) {
      console.error("Deadline sync error:", e);
    }

    const limitParam = req.nextUrl.searchParams.get("limit");
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10), 1), 50) : 20;

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: user.id },
        include: {
          task: {
            select: {
              id: true,
              title: true,
              archivedAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.notification.count({
        where: { userId: user.id, readAt: null },
      }),
    ]);

    // Format for client
    const formatted = notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      readAt: n.readAt ? n.readAt.toISOString() : null,
      createdAt: n.createdAt.toISOString(),
      task: n.task
        ? {
            id: n.task.id,
            title: n.task.title,
            deletedAt: n.task.archivedAt ? n.task.archivedAt.toISOString() : null,
          }
        : null,
    }));

    return NextResponse.json({
      notifications: formatted,
      unreadCount,
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await ensureCurrentUser();
    const body = await req.json().catch(() => ({}));
    const prisma = getPrisma();

    if (body.readAll) {
      await prisma.notification.updateMany({
        where: { userId: user.id, readAt: null },
        data: { readAt: new Date() },
      });
      return NextResponse.json({ success: true, message: "Tüm bildirimler okundu olarak işaretlendi" });
    }

    if (typeof body.id === "string") {
      const read = body.read !== false;
      const notif = await prisma.notification.findFirst({
        where: { id: body.id, userId: user.id },
      });

      if (!notif) {
        return badRequest("Bildirim bulunamadı");
      }

      const updated = await prisma.notification.update({
        where: { id: body.id },
        data: { readAt: read ? new Date() : null },
      });

      return NextResponse.json({ success: true, notification: updated });
    }

    return badRequest("Geçersiz istek parametresi");
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await ensureCurrentUser();
    const body = await req.json().catch(() => ({}));

    if (!body.title || typeof body.title !== "string") {
      return badRequest("Bildirim başlığı zorunludur");
    }

    const created = await createNotification({
      userId: user.id,
      taskId: body.taskId,
      type: body.type ?? "SYSTEM",
      title: body.title,
      body: body.body,
    });

    return NextResponse.json({ success: true, notification: created }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await ensureCurrentUser();
    const id = req.nextUrl.searchParams.get("id");
    const prisma = getPrisma();

    if (id) {
      await prisma.notification.deleteMany({
        where: { id, userId: user.id },
      });
      return NextResponse.json({ success: true });
    }

    // Delete all read notifications if clear=read
    if (req.nextUrl.searchParams.get("clear") === "read") {
      await prisma.notification.deleteMany({
        where: { userId: user.id, readAt: { not: null } },
      });
      return NextResponse.json({ success: true });
    }

    return badRequest("Geçersiz silme isteği");
  } catch (error) {
    return apiError(error);
  }
}
