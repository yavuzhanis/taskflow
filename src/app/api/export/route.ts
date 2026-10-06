import { NextRequest, NextResponse } from "next/server";
import { ensureCurrentUser } from "@/lib/auth/current-user";
import { apiError } from "@/lib/api/http";
import { getPrisma } from "@/lib/db/prisma";
import { taskInclude } from "@/lib/db/tasks";

function csvCell(value: unknown) { const s = value == null ? "" : String(value); return `"${s.replaceAll('"', '""')}"`; }

export async function GET(req: NextRequest) {
  try {
    const user = await ensureCurrentUser(); const prisma = getPrisma();
    const tasks = await prisma.task.findMany({ where: { userId: user.id }, include: taskInclude, orderBy: { createdAt: "desc" } });
    if (req.nextUrl.searchParams.get("format") === "csv") {
      const rows = [["id","title","status","priority","project","dueDate","tags","archivedAt"], ...tasks.map((t) => [t.id,t.title,t.status,t.priority,t.project?.name ?? "",t.dueDate?.toISOString() ?? "",t.taskTags.map((x) => x.tag.name).join("; "),t.archivedAt?.toISOString() ?? ""])];
      const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
      return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=taskflow-tasks.csv" } });
    }
    return new NextResponse(JSON.stringify({ exportedAt: new Date().toISOString(), tasks }, null, 2), { headers: { "Content-Type": "application/json", "Content-Disposition": "attachment; filename=taskflow-tasks.json" } });
  } catch (error) { return apiError(error); }
}
