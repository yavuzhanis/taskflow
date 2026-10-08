import { NextRequest, NextResponse } from "next/server";
import { ensureCurrentUser } from "@/lib/auth/current-user";
import { apiError, badRequest } from "@/lib/api/http";
import { attachmentSchema } from "@/lib/api/validation";
import { getPrisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await ensureCurrentUser();
    const { id } = await params;
    const parsed = attachmentSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Geçersiz ek verisi");

    const prisma = getPrisma();
    const task = await prisma.task.findFirst({ where: { id, userId: user.id }, select: { id: true } });
    if (!task) return NextResponse.json({ error: "Görev bulunamadı" }, { status: 404 });

    const attachment = await prisma.taskAttachment.create({
      data: {
        userId: user.id,
        taskId: id,
        name: parsed.data.name,
        url: parsed.data.url,
        mimeType: parsed.data.mimeType ?? null,
        size: parsed.data.size ?? null,
      },
    });

    return NextResponse.json({ attachment }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await ensureCurrentUser();
    const { id } = await params;
    const attachmentId = req.nextUrl.searchParams.get("attachmentId");
    if (!attachmentId) return badRequest("Ek dosya id gerekli");

    await getPrisma().taskAttachment.deleteMany({
      where: { id: attachmentId, taskId: id, userId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
