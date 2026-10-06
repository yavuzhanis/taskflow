import { NextRequest, NextResponse } from "next/server";
import { ensureCurrentUser } from "@/lib/auth/current-user";
import { apiError, badRequest } from "@/lib/api/http";
import { tagSchema } from "@/lib/api/validation";
import { getPrisma } from "@/lib/db/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await ensureCurrentUser(); const { id } = await params; const prisma = getPrisma();
    const parsed = tagSchema.partial().safeParse(await req.json()); if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Geçersiz etiket");
    if (!await prisma.tag.findFirst({ where: { id, userId: user.id }, select: { id: true } })) return NextResponse.json({ error: "Etiket bulunamadı" }, { status: 404 });
    const tag = await prisma.tag.update({ where: { id }, data: parsed.data }); return NextResponse.json({ tag });
  } catch (error) { return apiError(error); }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await ensureCurrentUser(); const { id } = await params; const result = await getPrisma().tag.deleteMany({ where: { id, userId: user.id } });
    if (!result.count) return NextResponse.json({ error: "Etiket bulunamadı" }, { status: 404 }); return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
