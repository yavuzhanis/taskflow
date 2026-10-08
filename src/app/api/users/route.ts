import { NextResponse } from "next/server";
import { ensureCurrentUser } from "@/lib/auth/current-user";
import { apiError } from "@/lib/api/http";
import { getPrisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    await ensureCurrentUser();
    const users = await getPrisma().user.findMany({
      select: { id: true, name: true, email: true, avatarUrl: true },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      take: 100,
    });

    return NextResponse.json({ users });
  } catch (error) {
    return apiError(error);
  }
}
