import { auth } from "@clerk/nextjs/server";
import { TasksWorkspace } from "@/components/tasks/tasks-workspace";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    projectId?: string;
    tagId?: string;
    smart?: string;
    status?: string;
    mode?: "active" | "archived" | "trash";
  }>;
}) {
  await auth.protect();
  const params = await searchParams;

  return (
    <TasksWorkspace
      initialSearch={params.q ?? ""}
      initialProjectId={params.projectId ?? ""}
      initialTagId={params.tagId ?? ""}
      initialSmart={params.smart ?? ""}
      initialStatus={params.status ?? ""}
      initialMode={params.mode ?? "active"}
    />
  );
}
