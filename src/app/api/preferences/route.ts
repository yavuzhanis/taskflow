import { NextRequest, NextResponse } from "next/server";
import { ensureCurrentUser } from "@/lib/auth/current-user";
import { apiError, badRequest } from "@/lib/api/http";
import { preferenceSchema } from "@/lib/api/validation";
import { getPrisma } from "@/lib/db/prisma";

export async function GET() {
  try { const user = await ensureCurrentUser(); return NextResponse.json({ preferences: user }); } catch (error) { return apiError(error); }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await ensureCurrentUser(); const parsed = preferenceSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Geçersiz tercih");
    const preferences = await getPrisma().user.update({ where: { id: user.id }, data: parsed.data }); return NextResponse.json({ preferences });
  } catch (error) { return apiError(error); }
}
