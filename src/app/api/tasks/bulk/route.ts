import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ensureCurrentUser } from "@/lib/auth/current-user";
import { apiError, badRequest } from "@/lib/api/http";
import { taskStatus } from "@/lib/api/validation";
import { getPrisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const idsSchema = z.array(z.string()).min(1).max(200);

const bulkActionSchema = z.union([
  z.object({
    action: z.literal("status"),
    ids: idsSchema,
    status: taskStatus,
  }),
  z.object({
    action: z.literal("archive"),
    ids: idsSchema,
  }),
  z.object({
    action: z.literal("trash"),
    ids: idsSchema,
  }),
  z.object({
    action: z.literal("restoreArchive"),
    ids: idsSchema,
  }),
  z.object({
    action: z.literal("restoreTrash"),
    ids: idsSchema,
  }),
  z.object({
    action: z.literal("deletePermanent"),
    ids: idsSchema,
  }),
]);

function uniqueIds(ids: string[]) {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await ensureCurrentUser();
    const parsed = bulkActionSchema.safeParse(await req.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Geçersiz toplu işlem isteği");
    }

    const ids = uniqueIds(parsed.data.ids);
    if (!ids.length) {
      return badRequest("İşlem yapılacak görev seçilmedi");
    }

    const prisma = getPrisma();
    const where = {
      userId: user.id,
      id: { in: ids },
    };

    if (parsed.data.action === "deletePermanent") {
      const result = await prisma.task.deleteMany({ where });

      try {
        const { logActivity } = await import("@/lib/notifications");
        await logActivity({
          userId: user.id,
          action: "TASK_BULK_DELETED",
          details: `${result.count} görev kalıcı olarak silindi.`,
        });
      } catch {}

      return NextResponse.json({ ok: true, count: result.count });
    }

    const now = new Date();
    const data =
      parsed.data.action === "status"
        ? {
            status: parsed.data.status,
            completedAt: parsed.data.status === "DONE" ? now : null,
          }
        : parsed.data.action === "archive"
          ? { archivedAt: now, deletedAt: null }
          : parsed.data.action === "trash"
            ? { deletedAt: now }
            : parsed.data.action === "restoreArchive"
              ? { archivedAt: null }
              : { deletedAt: null };

    const result = await prisma.task.updateMany({ where, data });

    try {
      const { logActivity } = await import("@/lib/notifications");
      await logActivity({
        userId: user.id,
        action: `TASK_BULK_${parsed.data.action.toUpperCase()}`,
        details: `${result.count} görev için toplu işlem uygulandı.`,
      });
    } catch {}

    return NextResponse.json({ ok: true, count: result.count });
  } catch (error) {
    return apiError(error);
  }
}
