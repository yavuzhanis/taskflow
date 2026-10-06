import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/http";
import { getPrisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const prisma = getPrisma();
    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: ["announcement", "announcement_type", "maintenance_mode"] } },
    });

    const map: Record<string, string> = {};
    settings.forEach((s) => {
      map[s.key] = s.value;
    });

    return NextResponse.json({
      announcement: map.announcement || "",
      announcementType: map.announcement_type || "info",
      maintenanceMode: map.maintenance_mode === "true",
    });
  } catch (error) {
    return apiError(error);
  }
}
