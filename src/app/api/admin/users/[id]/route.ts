import { NextRequest, NextResponse } from "next/server";
import { ensureAdminUser } from "@/lib/auth/current-user";
import { apiError, badRequest } from "@/lib/api/http";
import { getPrisma } from "@/lib/db/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await ensureAdminUser();
    const { id } = await params;
    const body = (await req.json()) as { role?: "ADMIN" | "USER" };

    if (!body.role || (body.role !== "ADMIN" && body.role !== "USER")) {
      return badRequest("Geçersiz rol");
    }

    if (id === admin.id && body.role !== "ADMIN") {
      return badRequest("Kendi admin yetkinizi kaldıramazsınız.");
    }

    const prisma = getPrisma();
    const updated = await prisma.user.update({
      where: { id },
      data: { role: body.role },
      select: { id: true, email: true, name: true, role: true },
    });

    return NextResponse.json({ user: updated, message: "Kullanıcı rolü güncellendi" });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await ensureAdminUser();
    const { id } = await params;

    if (id === admin.id) {
      return badRequest("Kendi hesabınızı silemezsiniz.");
    }

    const prisma = getPrisma();
    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Kullanıcı silindi" });
  } catch (error) {
    return apiError(error);
  }
}
