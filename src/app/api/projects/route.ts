import { NextRequest, NextResponse } from "next/server";
import { ensureCurrentUser } from "@/lib/auth/current-user";
import { apiError, badRequest } from "@/lib/api/http";
import { projectSchema } from "@/lib/api/validation";
import { getPrisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const user = await ensureCurrentUser();
    const projects = await getPrisma().project.findMany({ where: { userId: user.id, isArchived: false }, include: { _count: { select: { tasks: { where: { archivedAt: null } } } } }, orderBy: { updatedAt: "desc" } });
    return NextResponse.json({ projects });
  } catch (error) { return apiError(error); }
}

export async function POST(req: NextRequest) {
  try {
    const user = await ensureCurrentUser(); const parsed = projectSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Geçersiz proje verisi");
    const project = await getPrisma().project.create({ data: { userId: user.id, name: parsed.data.name, description: parsed.data.description ?? null, color: parsed.data.color ?? "#6366f1" }, include: { _count: { select: { tasks: true } } } });
    try {
      const { logActivity } = await import("@/lib/notifications");
      await logActivity({
        userId: user.id,
        action: "PROJECT_CREATED",
        details: `"${project.name}" projesi oluşturuldu.`,
      });
    } catch {}
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) { return apiError(error); }
}
