import { NextRequest, NextResponse } from "next/server";
import { ensureCurrentUser } from "@/lib/auth/current-user";
import { apiError, badRequest } from "@/lib/api/http";
import { subtaskSchema } from "@/lib/api/validation";
import { getPrisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await ensureCurrentUser(); const { id } = await params; const prisma = getPrisma();
    const parsed = subtaskSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Geçersiz alt görev");
    if (!await prisma.task.findFirst({ where: { id, userId: user.id }, select: { id: true } })) return NextResponse.json({ error: "Görev bulunamadı" }, { status: 404 });
    const subtask = await prisma.subtask.create({ data: { userId: user.id, taskId: id, title: parsed.data.title, position: Date.now() } });
    return NextResponse.json({ subtask }, { status: 201 });
  } catch (error) { return apiError(error); }
}
