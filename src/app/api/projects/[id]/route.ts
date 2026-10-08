import { NextRequest, NextResponse } from "next/server";
import { ensureCurrentUser } from "@/lib/auth/current-user";
import { apiError, badRequest } from "@/lib/api/http";
import { projectSchema } from "@/lib/api/validation";
import { getPrisma } from "@/lib/db/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await ensureCurrentUser(); const { id } = await params; const prisma = getPrisma(); const body = await req.json();
    if (typeof body.isArchived === "boolean" && Object.keys(body).length === 1) {
      const result = await prisma.project.updateMany({ where: { id, userId: user.id }, data: { isArchived: body.isArchived } });
      if (!result.count) return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
      return NextResponse.json({ ok: true });
    }
    const parsed = projectSchema.partial().safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Geçersiz proje verisi");
    if (!await prisma.project.findFirst({ where: { id, userId: user.id }, select: { id: true } })) return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
    const project = await prisma.project.update({
      where: { id },
      data: {
        ...parsed.data,
        completionEmailTo:
          parsed.data.completionEmailTo === undefined
            ? undefined
            : parsed.data.completionEmailTo?.trim() || null,
      },
      include: { _count: { select: { tasks: true } } },
    });
    return NextResponse.json({ project });
  } catch (error) { return apiError(error); }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await ensureCurrentUser(); const { id } = await params; const prisma = getPrisma();
    const project = await prisma.project.findFirst({ where: { id, userId: user.id }, select: { id: true } });
    if (!project) return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
    await prisma.$transaction([prisma.task.updateMany({ where: { userId: user.id, projectId: id }, data: { projectId: null } }), prisma.project.delete({ where: { id } })]);
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
