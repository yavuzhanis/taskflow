import { NextRequest, NextResponse } from "next/server";

import { ensureCurrentUser } from "@/lib/auth/current-user";
import { apiError, badRequest } from "@/lib/api/http";
import { getPrisma } from "@/lib/db/prisma";
import type { TaskPriority, TaskStatus } from "@/types/task";

export const dynamic = "force-dynamic";

const maxBytes = 2_000_000;
const maxRows = 500;

type ImportRow = {
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  projectName: string;
  tagNames: string[];
  dueDate: Date | null;
};

function normalizeKey(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function decodeXml(value: string) {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&")
    .trim();
}

function parseExcelXml(text: string) {
  const rows: string[][] = [];

  for (const rowMatch of text.matchAll(/<Row\b[^>]*>([\s\S]*?)<\/Row>/gi)) {
    const cells: string[] = [];

    for (const cellMatch of rowMatch[1].matchAll(/<Cell\b[^>]*>([\s\S]*?)<\/Cell>/gi)) {
      const dataMatch = cellMatch[1].match(/<Data\b[^>]*>([\s\S]*?)<\/Data>/i);
      cells.push(dataMatch ? decodeXml(dataMatch[1].replace(/<[^>]+>/g, "")) : "");
    }

    if (cells.some((cell) => cell.trim())) {
      rows.push(cells);
    }
  }

  return rows;
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(cell);
      if (row.some((value) => value.trim())) {
        rows.push(row);
      }
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim())) {
    rows.push(row);
  }

  if (rows[0]?.[0]) {
    rows[0][0] = rows[0][0].replace(/^\uFEFF/, "");
  }

  return rows;
}

function getCell(
  row: string[],
  headerMap: Map<string, number>,
  keys: string[],
) {
  for (const key of keys) {
    const index = headerMap.get(key);
    if (index !== undefined) {
      return row[index]?.trim() ?? "";
    }
  }

  return "";
}

function normalizeStatus(value: string): TaskStatus {
  const key = normalizeKey(value);
  if (key === "done" || key.includes("tamam")) {
    return "DONE";
  }
  if (key === "inprogress" || key.includes("devam")) {
    return "IN_PROGRESS";
  }
  return "TODO";
}

function normalizePriority(value: string): TaskPriority {
  const key = normalizeKey(value);
  if (key === "critical" || key.includes("kritik")) {
    return "CRITICAL";
  }
  if (key === "high" || key.includes("yuksek")) {
    return "HIGH";
  }
  if (key === "low" || key.includes("dusuk")) {
    return "LOW";
  }
  return "NORMAL";
}

function parseDueDate(value: string) {
  if (!value.trim()) {
    return null;
  }

  const normalized = value.trim().replace(" ", "T");
  const date =
    /^\d{4}-\d{2}-\d{2}$/.test(normalized)
      ? new Date(`${normalized}T12:00:00`)
      : new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date;
}

function parseRows(rows: string[][]) {
  const [headers, ...body] = rows;
  if (!headers?.length) {
    return { rows: [], errors: ["Dosyada okunabilir başlık satırı bulunamadı."] };
  }

  const headerMap = new Map(headers.map((header, index) => [normalizeKey(header), index]));
  const parsedRows: ImportRow[] = [];
  const errors: string[] = [];

  body.slice(0, maxRows).forEach((row, index) => {
    const rowNumber = index + 2;
    const title = getCell(row, headerMap, ["baslik", "title", "gorev", "task"]);

    if (!title) {
      errors.push(`${rowNumber}. satır atlandı: başlık boş.`);
      return;
    }

    const dueDateValue = getCell(row, headerMap, ["sontarih", "duedate", "deadline"]);
    const dueDate = parseDueDate(dueDateValue);
    if (dueDate === undefined) {
      errors.push(`${rowNumber}. satır atlandı: son tarih okunamadı.`);
      return;
    }

    const tagText = getCell(row, headerMap, ["etiketler", "tags", "tag"]);

    parsedRows.push({
      title: title.slice(0, 240),
      description:
        getCell(row, headerMap, ["aciklama", "description"]).slice(0, 20_000) ||
        null,
      status: normalizeStatus(getCell(row, headerMap, ["durum", "status"])),
      priority: normalizePriority(getCell(row, headerMap, ["oncelik", "priority"])),
      projectName: getCell(row, headerMap, ["proje", "project"]).slice(0, 100),
      tagNames: tagText
        .split(/[;,]/)
        .map((tag) => tag.trim().replace(/^#/, ""))
        .filter(Boolean)
        .slice(0, 30),
      dueDate,
    });
  });

  if (body.length > maxRows) {
    errors.push(`İlk ${maxRows} satır içe aktarıldı; kalan satırlar atlandı.`);
  }

  return { rows: parsedRows, errors };
}

export async function POST(req: NextRequest) {
  try {
    const user = await ensureCurrentUser();
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return badRequest("İçe aktarılacak CSV veya Excel dosyasını seçin");
    }

    if (file.size > maxBytes) {
      return badRequest("Dosya çok büyük. En fazla 2 MB yükleyebilirsiniz.");
    }

    const text = await file.text();
    const trimmed = text.trimStart();
    const rows =
      trimmed.startsWith("<?xml") || trimmed.includes("<Workbook")
        ? parseExcelXml(text)
        : parseCsv(text);
    const parsed = parseRows(rows);

    if (!parsed.rows.length) {
      return badRequest(parsed.errors[0] ?? "İçe aktarılacak görev bulunamadı");
    }

    const prisma = getPrisma();
    const result = await prisma.$transaction(async (tx) => {
      const projects = await tx.project.findMany({
        where: { userId: user.id, isArchived: false },
        select: { id: true, name: true },
      });
      const tags = await tx.tag.findMany({
        where: { userId: user.id },
        select: { id: true, name: true },
      });
      const projectByName = new Map(projects.map((project) => [normalizeKey(project.name), project]));
      const tagByName = new Map(tags.map((tag) => [normalizeKey(tag.name), tag]));
      let created = 0;

      for (const row of parsed.rows) {
        let projectId: string | null = null;

        if (row.projectName) {
          const projectKey = normalizeKey(row.projectName);
          let project = projectByName.get(projectKey);

          if (!project) {
            project = await tx.project.create({
              data: {
                userId: user.id,
                name: row.projectName,
                color: "#6366f1",
              },
              select: { id: true, name: true },
            });
            projectByName.set(projectKey, project);
          }

          projectId = project.id;
        }

        const tagIds: string[] = [];
        for (const tagName of row.tagNames) {
          const tagKey = normalizeKey(tagName);
          let tag = tagByName.get(tagKey);

          if (!tag) {
            tag = await tx.tag.create({
              data: {
                userId: user.id,
                name: tagName.slice(0, 60),
                color: "#64748b",
              },
              select: { id: true, name: true },
            });
            tagByName.set(tagKey, tag);
          }

          tagIds.push(tag.id);
        }

        await tx.task.create({
          data: {
            userId: user.id,
            title: row.title,
            description: row.description,
            status: row.status,
            priority: row.priority,
            projectId,
            dueDate: row.dueDate,
            completedAt: row.status === "DONE" ? new Date() : null,
            position: Date.now() + created,
            taskTags: tagIds.length
              ? {
                  create: [...new Set(tagIds)].map((tagId) => ({
                    userId: user.id,
                    tagId,
                  })),
                }
              : undefined,
          },
        });

        created += 1;
      }

      return { created };
    });

    try {
      const { logActivity } = await import("@/lib/notifications");
      await logActivity({
        userId: user.id,
        action: "TASKS_IMPORTED",
        details: `${result.created} görev dosyadan içe aktarıldı.`,
      });
    } catch {}

    return NextResponse.json({
      ok: true,
      created: result.created,
      skipped: parsed.errors.length,
      errors: parsed.errors.slice(0, 10),
    });
  } catch (error) {
    return apiError(error);
  }
}
