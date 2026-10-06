import { NextResponse } from "next/server";

export function apiError(error: unknown) {
  console.error(error);
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : "";
  if (code === "P2002") return NextResponse.json({ error: "Aynı isimde bir kayıt zaten var." }, { status: 409 });
  if (code === "P2025") return NextResponse.json({ error: "Kayıt bulunamadı." }, { status: 404 });
  return NextResponse.json({ error: error instanceof Error ? error.message : "Unexpected server error" }, { status: 500 });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}
