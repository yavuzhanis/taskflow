import { NextRequest, NextResponse } from "next/server";
import { ensureCurrentUser } from "@/lib/auth/current-user";
import { apiError, badRequest } from "@/lib/api/http";
import { getPrisma } from "@/lib/db/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; subtaskId: string }> }) {
  try {
    const user = await ensureCurrentUser(); const { id, subtaskId } = await params; const body = await req.json(); const prisma = getPrisma();
    const existing = await prisma.subtask.findFirst({ where: { id: subtaskId, taskId: id, userId: user.id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Alt görev bulunamadı" }, { status: 404 });
    if (typeof body.title !== "undefined" && (typeof body.title !== "string" || !body.title.trim())) return badRequest("Alt görev başlığı gerekli");
    const subtask = await prisma.subtask.update({ where: { id: subtaskId }, data: { title: typeof body.title === "string" ? body.title.trim() : undefined, isCompleted: typeof body.isCompleted === "boolean" ? body.isCompleted : undefined } });
    return NextResponse.json({ subtask });
  } catch (error) { return apiError(error); }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string; subtaskId: string }> }) {
  try {
    const user = await ensureCurrentUser(); const { id, subtaskId } = await params;
    const result = await getPrisma().subtask.deleteMany({ where: { id: subtaskId, taskId: id, userId: user.id } });
    if (!result.count) return NextResponse.json({ error: "Alt görev bulunamadı" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
