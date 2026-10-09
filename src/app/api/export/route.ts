import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { ensureCurrentUser } from "@/lib/auth/current-user";
import { apiError, badRequest } from "@/lib/api/http";
import { getPrisma } from "@/lib/db/prisma";
import {
  buildTaskWhereFromSearchParams,
  runAutoArchive,
  taskInclude,
  taskOrderByForSort,
} from "@/lib/db/tasks";

export const dynamic = "force-dynamic";

type ExportFormat = "json" | "csv" | "excel";

const exportTaskInclude = {
  ...taskInclude,
  _count: {
    select: {
      attachments: true,
      comments: true,
      subtasks: true,
    },
  },
} as const satisfies Prisma.TaskInclude;

type ExportTask = Prisma.TaskGetPayload<{ include: typeof exportTaskInclude }>;

const statusLabel = {
  TODO: "Yapılacak",
  IN_PROGRESS: "Devam ediyor",
  DONE: "Tamamlandı",
} as const;

const priorityLabel = {
  LOW: "Düşük",
  NORMAL: "Normal",
  HIGH: "Yüksek",
  CRITICAL: "Kritik",
} as const;

const approvalLabel = {
  NOT_REQUIRED: "Gerekli değil",
  PENDING: "Bekliyor",
  APPROVED: "Onaylandı",
  REVISION_REQUESTED: "Revizyon istendi",
} as const;

const recurrenceLabel = {
  NONE: "Yok",
  DAILY: "Günlük",
  WEEKLY: "Haftalık",
  MONTHLY: "Aylık",
} as const;

const exportColumns = [
  { header: "ID", value: (task: ExportTask) => task.id },
  { header: "Başlık", value: (task: ExportTask) => task.title },
  { header: "Açıklama", value: (task: ExportTask) => task.description ?? "" },
  { header: "Durum", value: (task: ExportTask) => statusLabel[task.status] },
  { header: "Öncelik", value: (task: ExportTask) => priorityLabel[task.priority] },
  { header: "Proje", value: (task: ExportTask) => task.project?.name ?? "" },
  { header: "Atanan", value: (task: ExportTask) => task.assignedTo?.name ?? task.assignedTo?.email ?? "" },
  { header: "Onay Durumu", value: (task: ExportTask) => approvalLabel[task.approvalStatus] },
  { header: "Onay Notu", value: (task: ExportTask) => task.approvalNote ?? "" },
  { header: "Tekrarlama", value: (task: ExportTask) => recurrenceLabel[task.recurrenceFrequency] },
  { header: "Son Tarih", value: (task: ExportTask) => formatDateTime(task.dueDate) },
  { header: "Tamamlanma", value: (task: ExportTask) => formatDateTime(task.completedAt) },
  { header: "Arşivlenme", value: (task: ExportTask) => formatDateTime(task.archivedAt) },
  { header: "Silinme", value: (task: ExportTask) => formatDateTime(task.deletedAt) },
  { header: "Etiketler", value: (task: ExportTask) => task.taskTags.map((item) => item.tag.name).join("; ") },
  { header: "Alt Görevler", value: (task: ExportTask) => formatSubtasks(task) },
  { header: "Yorum Sayısı", value: (task: ExportTask) => String(task._count.comments) },
  { header: "Ek Sayısı", value: (task: ExportTask) => String(task._count.attachments) },
  { header: "Oluşturma", value: (task: ExportTask) => formatDateTime(task.createdAt) },
  { header: "Güncelleme", value: (task: ExportTask) => formatDateTime(task.updatedAt) },
];

function parseFormat(value: string | null): ExportFormat | null {
  if (!value || value === "json") {
    return "json";
  }

  if (value === "csv") {
    return "csv";
  }

  if (value === "excel" || value === "xls") {
    return "excel";
  }

  return null;
}

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().replace("T", " ").slice(0, 16);
}

function formatSubtasks(task: ExportTask) {
  if (!task.subtasks.length) {
    return "";
  }

  const completed = task.subtasks.filter((item) => item.isCompleted).length;
  return `${completed}/${task.subtasks.length}`;
}

function safeSpreadsheetText(value: unknown) {
  const text = value == null ? "" : String(value);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function csvCell(value: unknown) {
  return `"${safeSpreadsheetText(value).replaceAll('"', '""')}"`;
}

function xmlCell(value: unknown, styleId?: string) {
  const text = safeSpreadsheetText(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
  const style = styleId ? ` ss:StyleID="${styleId}"` : "";
  return `<Cell${style}><Data ss:Type="String">${text}</Data></Cell>`;
}

function buildRows(tasks: ExportTask[]) {
  return [
    exportColumns.map((column) => column.header),
    ...tasks.map((task) => exportColumns.map((column) => column.value(task))),
  ];
}

function buildCsv(tasks: ExportTask[]) {
  const rows = buildRows(tasks);
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

function buildExcelXml(tasks: ExportTask[]) {
  const rows = buildRows(tasks)
    .map((row, index) => {
      const styleId = index === 0 ? "Header" : undefined;
      return `<Row>${row.map((cell) => xmlCell(cell, styleId)).join("")}</Row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Header">
      <Font ss:Bold="1"/>
      <Interior ss:Color="#D9EAD3" ss:Pattern="Solid"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="Gorevler">
    <Table>${rows}</Table>
  </Worksheet>
</Workbook>`;
}

function filenameFor(format: ExportFormat) {
  const date = new Date().toISOString().slice(0, 10);
  const extension = format === "excel" ? "xls" : format;
  return `taskflow-tasks-${date}.${extension}`;
}

function downloadHeaders(format: ExportFormat) {
  const contentTypes = {
    json: "application/json; charset=utf-8",
    csv: "text/csv; charset=utf-8",
    excel: "application/vnd.ms-excel; charset=utf-8",
  } as const;

  return {
    "Cache-Control": "no-store",
    "Content-Type": contentTypes[format],
    "Content-Disposition": `attachment; filename="${filenameFor(format)}"`,
  };
}

export async function GET(req: NextRequest) {
  try {
    const format = parseFormat(req.nextUrl.searchParams.get("format"));
    if (!format) {
      return badRequest("Desteklenmeyen dışa aktarma formatı");
    }

    const user = await ensureCurrentUser();
    await runAutoArchive(user.id);
    const prisma = getPrisma();
    const where = buildTaskWhereFromSearchParams(user.id, req.nextUrl.searchParams, {
      defaultLifecycle:
        req.nextUrl.searchParams.get("scope") === "view" ? "active" : "all",
    });
    const tasks = await prisma.task.findMany({
      where,
      include: exportTaskInclude,
      orderBy: taskOrderByForSort(req.nextUrl.searchParams.get("sort")),
    });

    if (format === "csv") {
      return new NextResponse(buildCsv(tasks), { headers: downloadHeaders(format) });
    }

    if (format === "excel") {
      return new NextResponse(buildExcelXml(tasks), { headers: downloadHeaders(format) });
    }

    return new NextResponse(
      JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          filters: Object.fromEntries(req.nextUrl.searchParams),
          total: tasks.length,
          tasks,
        },
        null,
        2,
      ),
      { headers: downloadHeaders(format) },
    );
  } catch (error) {
    return apiError(error);
  }
}
