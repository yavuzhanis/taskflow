import { NextRequest, NextResponse } from "next/server";
import { ensureCurrentUser } from "@/lib/auth/current-user";
import { apiError, badRequest } from "@/lib/api/http";
import { commentSchema } from "@/lib/api/validation";
import { getPrisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await ensureCurrentUser(); const { id } = await params; const prisma = getPrisma();
    const parsed = commentSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Geçersiz yorum");
    if (!await prisma.task.findFirst({ where: { id, userId: user.id }, select: { id: true } })) return NextResponse.json({ error: "Görev bulunamadı" }, { status: 404 });
    const comment = await prisma.taskComment.create({ data: { userId: user.id, taskId: id, body: parsed.data.body } });
    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) { return apiError(error); }
}
