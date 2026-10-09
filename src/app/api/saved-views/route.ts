import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ensureCurrentUser } from "@/lib/auth/current-user";
import { apiError, badRequest } from "@/lib/api/http";
import { getPrisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const savedViewSchema = z.object({
  name: z.string().trim().min(1).max(60),
  filters: z.object({
    mode: z.enum(["active", "archived", "trash"]).default("active"),
    smart: z.string().max(40).optional().default(""),
    status: z.string().max(40).optional().default(""),
    projectId: z.string().max(120).optional().default(""),
    tagId: z.string().max(120).optional().default(""),
    sort: z.string().max(40).optional().default("created"),
    view: z.enum(["list", "kanban", "calendar"]).default("list"),
  }),
});

type SavedView = z.infer<typeof savedViewSchema> & {
  id: string;
  createdAt: string;
};

function keyFor(userId: string) {
  return `user:${userId}:saved-views:v1`;
}

function parseViews(value: string | null | undefined): SavedView[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function readViews(userId: string) {
  const setting = await getPrisma().systemSetting.findUnique({
    where: { key: keyFor(userId) },
    select: { value: true },
  });

  return parseViews(setting?.value);
}

async function writeViews(userId: string, views: SavedView[]) {
  await getPrisma().systemSetting.upsert({
    where: { key: keyFor(userId) },
    create: { key: keyFor(userId), value: JSON.stringify(views) },
    update: { value: JSON.stringify(views) },
  });
}

export async function GET() {
  try {
    const user = await ensureCurrentUser();
    const views = await readViews(user.id);
    return NextResponse.json({ views });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await ensureCurrentUser();
    const parsed = savedViewSchema.safeParse(await req.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Geçersiz görünüm verisi");
    }

    const current = await readViews(user.id);
    const nextView: SavedView = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...parsed.data,
    };
    const views = [nextView, ...current.filter((view) => view.name !== nextView.name)].slice(0, 20);

    await writeViews(user.id, views);

    return NextResponse.json({ view: nextView, views }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await ensureCurrentUser();
    const id = req.nextUrl.searchParams.get("id");

    if (!id) {
      return badRequest("Silinecek görünüm seçilmedi");
    }

    const current = await readViews(user.id);
    const views = current.filter((view) => view.id !== id);
    await writeViews(user.id, views);

    return NextResponse.json({ ok: true, views });
  } catch (error) {
    return apiError(error);
  }
}
