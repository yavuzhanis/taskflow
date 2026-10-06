import { NextResponse } from "next/server";
import { ensureAdminUser } from "@/lib/auth/current-user";
import { apiError } from "@/lib/api/http";
import { runGlobalAutoArchive } from "@/lib/db/tasks";

export async function POST() {
  try {
    await ensureAdminUser();
    const count = await runGlobalAutoArchive();
    return NextResponse.json({
      success: true,
      count,
      message: `${count} adet tamamlanmış görev başarıyla arşivlendi.`,
    });
  } catch (error) {
    return apiError(error);
  }
}
