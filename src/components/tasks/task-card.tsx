"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Check,
  CheckSquare2,
  CircleAlert,
  GripVertical,
  MessageSquare,
  Paperclip,
  Repeat2,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { playSuccessChime } from "@/lib/audio";
import { fetchJson, formatDate } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import type { TaskApprovalStatus, TaskDTO } from "@/types/task";

const priorityConfig = {
  LOW: { label: "Düşük", dot: "bg-zinc-400", badge: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400" },
  NORMAL: { label: "Normal", dot: "bg-blue-500", badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  HIGH: { label: "Yüksek", dot: "bg-amber-500", badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  CRITICAL: { label: "Kritik", dot: "bg-red-500", badge: "bg-red-500/10 text-red-600 dark:text-red-400" },
} as const;

const approvalConfig: Record<
  TaskApprovalStatus,
  { label: string; className: string }
> = {
  NOT_REQUIRED: {
    label: "Onay yok",
    className: "bg-muted text-muted-foreground",
  },
  PENDING: {
    label: "Onay bekliyor",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  APPROVED: {
    label: "Onaylandı",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  REVISION_REQUESTED: {
    label: "Revizyon",
    className: "bg-red-500/10 text-red-700 dark:text-red-300",
  },
};

const recurrenceLabel = {
  DAILY: "Günlük",
  WEEKLY: "Haftalık",
  MONTHLY: "Aylık",
} as const;

export function TaskCard({
  task,
  dragHandle,
}: {
  task: TaskDTO;
  dragHandle?: React.ReactNode;
}) {
  const qc = useQueryClient();
  const setTaskDetailId = useUIStore((state) => state.setTaskDetailId);

  const toggleComplete = useMutation({
    mutationFn: async () => {
      const nextStatus = task.status === "DONE" ? "TODO" : "DONE";
      return fetchJson<{ task: TaskDTO }>(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      if (task.status !== "DONE") {
        playSuccessChime();
        toast.success("Görev tamamlandı!", {
          description: `"${task.title}" başarıyla tamamlandı olarak işaretlendi.`,
        });
      } else {
        toast.info("Görev yeniden açıldı", {
          description: `"${task.title}" yapılacaklar listesine alındı.`,
        });
      }
    },
    onError: (err: Error) => {
      toast.error(err?.message || "İşlem başarısız oldu");
    },
  });

  const overdue =
    Boolean(task.dueDate) &&
    new Date(task.dueDate as string) < new Date() &&
    task.status !== "DONE";

  const totalSubtasks = task.subtasks?.length ?? 0;
  const completedSubtasks =
    task.subtasks?.filter((s) => s.isCompleted).length ?? 0;
  const commentCount = task.comments?.length ?? 0;
  const attachmentCount = task.attachments?.length ?? 0;

  const priorityInfo = priorityConfig[task.priority] ?? priorityConfig.NORMAL;
  const approvalInfo = approvalConfig[task.approvalStatus];

  return (
    <article
      onClick={() => setTaskDetailId(task.id)}
      className={`group cursor-pointer rounded-2xl border border-border/80 bg-card/90 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card hover:shadow-md ${
        task.status === "DONE" ? "opacity-75 hover:opacity-100" : ""
      }`}
    >
      <div className="flex items-start gap-2.5">
        <div className="pt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-foreground transition-colors">
          {dragHandle ?? <GripVertical className="size-4" />}
        </div>

        {/* Quick Complete Circle Checkbox */}
        <button
          type="button"
          title={task.status === "DONE" ? "Görevi yeniden aç" : "Görevi tamamlandı olarak işaretle"}
          disabled={toggleComplete.isPending}
          onClick={(e) => {
            e.stopPropagation();
            toggleComplete.mutate();
          }}
          className={`group/check relative mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition-all duration-200 ${
            task.status === "DONE"
              ? "border-emerald-500 bg-emerald-500 text-white shadow-xs"
              : "border-border/80 bg-background/50 hover:border-emerald-500 hover:bg-emerald-500/10"
          } ${toggleComplete.isPending ? "opacity-50 animate-pulse" : ""}`}
        >
          {task.status === "DONE" ? (
            <Check className="size-3 stroke-[2.5]" />
          ) : (
            <Check className="size-3 stroke-[2.5] text-emerald-500 opacity-0 transition-opacity group-hover/check:opacity-100" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          {/* Title */}
          <h3
            className={`text-sm font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary ${
              task.status === "DONE" ? "line-through text-muted-foreground" : "text-foreground"
            }`}
          >
            {task.title}
          </h3>

          {/* Description snippet if any */}
          {task.description && (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {task.description}
            </p>
          )}

          {/* Metadata Chips */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {/* Priority Badge */}
            <span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[10px] font-semibold ${priorityInfo.badge}`}>
              <span className={`size-1.5 rounded-full ${priorityInfo.dot}`} />
              {priorityInfo.label}
            </span>

            {/* Project Badge */}
            {task.project && (
              <span className="inline-flex max-w-[150px] items-center gap-1.5 rounded-lg border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: task.project.color }}
                />
                <span className="truncate">{task.project.name}</span>
              </span>
            )}

            {task.assignedTo && (
              <span className="inline-flex max-w-[150px] items-center gap-1.5 rounded-lg border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                <UserRound className="size-3 shrink-0" />
                <span className="truncate">
                  {task.assignedTo.name || task.assignedTo.email}
                </span>
              </span>
            )}

            {task.approvalStatus !== "NOT_REQUIRED" && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[10px] font-semibold ${approvalInfo.className}`}
              >
                <ShieldCheck className="size-3" />
                {approvalInfo.label}
              </span>
            )}

            {task.recurrenceFrequency !== "NONE" && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                <Repeat2 className="size-3" />
                {recurrenceLabel[task.recurrenceFrequency]}
              </span>
            )}

            {/* Tags */}
            {task.taskTags?.slice(0, 2).map(({ tag }) => (
              <span
                key={tag.id}
                className="rounded-lg border border-border/60 bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                #{tag.name}
              </span>
            ))}
          </div>

          {/* Footer stats: Due Date, Subtasks, Comments */}
          <div className="mt-3 flex items-center justify-between pt-2 border-t border-border/40 text-xs text-muted-foreground">
            {task.dueDate ? (
              <span
                className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
                  overdue
                    ? "bg-destructive/10 text-destructive font-semibold"
                    : "text-muted-foreground"
                }`}
              >
                {overdue ? (
                  <CircleAlert className="size-3" />
                ) : (
                  <CalendarDays className="size-3" />
                )}
                {formatDate(task.dueDate)}
              </span>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2 text-[11px]">
              {totalSubtasks > 0 && (
                <span
                  className={`inline-flex items-center gap-1 font-medium ${
                    completedSubtasks === totalSubtasks
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground"
                  }`}
                  title={`${totalSubtasks} alt görevden ${completedSubtasks} tanesi tamamlandı`}
                >
                  <CheckSquare2 className="size-3" />
                  {completedSubtasks}/{totalSubtasks}
                </span>
              )}

              {commentCount > 0 && (
                <span
                  className="inline-flex items-center gap-1 text-muted-foreground"
                  title={`${commentCount} yorum`}
                >
                  <MessageSquare className="size-3" />
                  {commentCount}
                </span>
              )}

              {attachmentCount > 0 && (
                <span
                  className="inline-flex items-center gap-1 text-muted-foreground"
                  title={`${attachmentCount} ek`}
                >
                  <Paperclip className="size-3" />
                  {attachmentCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
