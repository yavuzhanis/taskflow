import { NextRequest, NextResponse } from "next/server";
import { ensureCurrentUser } from "@/lib/auth/current-user";
import { apiError, badRequest } from "@/lib/api/http";
import { tagSchema } from "@/lib/api/validation";
import { getPrisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const user = await ensureCurrentUser();
    const tags = await getPrisma().tag.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } });
    return NextResponse.json({ tags });
  } catch (error) { return apiError(error); }
}

export async function POST(req: NextRequest) {
  try {
    const user = await ensureCurrentUser(); const parsed = tagSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Geçersiz etiket verisi");
    const tag = await getPrisma().tag.create({ data: { userId: user.id, name: parsed.data.name, color: parsed.data.color ?? "#64748b" } });
    return NextResponse.json({ tag }, { status: 201 });
  } catch (error) { return apiError(error); }
}
