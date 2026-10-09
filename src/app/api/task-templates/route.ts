import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ensureCurrentUser } from "@/lib/auth/current-user";
import { apiError, badRequest } from "@/lib/api/http";
import { taskPriority, taskStatus } from "@/lib/api/validation";
import { getPrisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const taskTemplateSchema = z.object({
  name: z.string().trim().min(1).max(60),
  title: z.string().trim().min(1).max(240),
  description: z.string().max(5000).optional().nullable(),
  status: taskStatus.default("TODO"),
  priority: taskPriority.default("NORMAL"),
  dueOffsetDays: z.number().int().min(0).max(365).optional().nullable(),
});

type TaskTemplate = z.infer<typeof taskTemplateSchema> & {
  id: string;
  createdAt: string;
};

function keyFor(userId: string) {
  return `user:${userId}:task-templates:v1`;
}

function parseTemplates(value: string | null | undefined): TaskTemplate[] {
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

async function readTemplates(userId: string) {
  const setting = await getPrisma().systemSetting.findUnique({
    where: { key: keyFor(userId) },
    select: { value: true },
  });

  return parseTemplates(setting?.value);
}

async function writeTemplates(userId: string, templates: TaskTemplate[]) {
  await getPrisma().systemSetting.upsert({
    where: { key: keyFor(userId) },
    create: { key: keyFor(userId), value: JSON.stringify(templates) },
    update: { value: JSON.stringify(templates) },
  });
}

export async function GET() {
  try {
    const user = await ensureCurrentUser();
    const templates = await readTemplates(user.id);
    return NextResponse.json({ templates });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await ensureCurrentUser();
    const parsed = taskTemplateSchema.safeParse(await req.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Geçersiz şablon verisi");
    }

    const current = await readTemplates(user.id);
    const template: TaskTemplate = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...parsed.data,
      description: parsed.data.description?.trim() || null,
      dueOffsetDays: parsed.data.dueOffsetDays ?? null,
    };
    const templates = [template, ...current.filter((item) => item.name !== template.name)].slice(0, 30);

    await writeTemplates(user.id, templates);

    return NextResponse.json({ template, templates }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await ensureCurrentUser();
    const id = req.nextUrl.searchParams.get("id");

    if (!id) {
      return badRequest("Silinecek şablon seçilmedi");
    }

    const current = await readTemplates(user.id);
    const templates = current.filter((template) => template.id !== id);
    await writeTemplates(user.id, templates);

    return NextResponse.json({ ok: true, templates });
  } catch (error) {
    return apiError(error);
  }
}
