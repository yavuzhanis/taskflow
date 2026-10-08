import { NextResponse } from "next/server";
import { ensureAdminUser } from "@/lib/auth/current-user";
import { apiError } from "@/lib/api/http";
import { runGlobalAutoArchive } from "@/lib/db/tasks";

export async function POST() {
  try {
    await ensureAdminUser();
    const count = await runGlobalAutoArchive({ force: true });
    return NextResponse.json({
      success: true,
      count,
      message:
        count > 0
          ? `${count} adet tamamlanmış görev başarıyla arşivlendi.`
          : "Arşivlenecek tamamlanmış görev bulunamadı.",
    });
  } catch (error) {
    return apiError(error);
  }
}
