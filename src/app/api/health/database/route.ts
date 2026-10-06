import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";
export async function GET() {
  try { await getPrisma().$queryRaw`SELECT 1`; return NextResponse.json({ ok: true, database: "connected" }); }
  catch (error) { return NextResponse.json({ ok: false, database: "disconnected", error: error instanceof Error ? error.message : "unknown" }, { status: 503 }); }
}
