import { NextRequest, NextResponse } from "next/server";
import { ensureAdminUser } from "@/lib/auth/current-user";
import { apiError } from "@/lib/api/http";
import { getPrisma } from "@/lib/db/prisma";

export async function PATCH(req: NextRequest) {
  try {
    await ensureAdminUser();
    const body = (await req.json()) as {
      announcement?: string;
      announcementType?: string;
      maintenanceMode?: boolean;
    };

    const prisma = getPrisma();
    const updates: Promise<unknown>[] = [];

    if (body.announcement !== undefined) {
      updates.push(
        prisma.systemSetting.upsert({
          where: { key: "announcement" },
          create: { key: "announcement", value: body.announcement },
          update: { value: body.announcement },
        })
      );
    }

    if (body.announcementType !== undefined) {
      updates.push(
        prisma.systemSetting.upsert({
          where: { key: "announcement_type" },
          create: { key: "announcement_type", value: body.announcementType },
          update: { value: body.announcementType },
        })
      );
    }

    if (body.maintenanceMode !== undefined) {
      updates.push(
        prisma.systemSetting.upsert({
          where: { key: "maintenance_mode" },
          create: { key: "maintenance_mode", value: String(body.maintenanceMode) },
          update: { value: String(body.maintenanceMode) },
        })
      );
    }

    await Promise.all(updates);

    return NextResponse.json({ success: true, message: "Sistem ayarları güncellendi" });
  } catch (error) {
    return apiError(error);
  }
}
