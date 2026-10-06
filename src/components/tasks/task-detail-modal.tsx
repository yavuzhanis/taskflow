"use client";

import { FormEvent, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Check, MessageSquare, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { playSuccessChime, playTrashSound } from "@/lib/audio";
import { fetchJson, toDateInputValue } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import type {
  ProjectDTO,
  TagDTO,
  TaskDTO,
  TaskPriority,
  TaskStatus,
} from "@/types/task";

type TaskDetailEditorProps = {
  task: TaskDTO;
  taskDetailId: string;
  projects: ProjectDTO[];
  tags: TagDTO[];
  onClose: () => void;
};

function TaskDetailEditor({
  task,
  taskDetailId,
  projects,
  tags,
  onClose,
}: TaskDetailEditorProps) {
  const qc = useQueryClient();

  // Form state is initialized when this editor mounts. The parent renders this
  // component with key={task.id}, so opening another task creates fresh state
  // without synchronously calling setState from an effect.
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [projectId, setProjectId] = useState(task.project?.id ?? "");
  const [dueDate, setDueDate] = useState(toDateInputValue(task.dueDate));
  const [tagIds, setTagIds] = useState<string[]>(
    task.taskTags.map(({ tag }) => tag.id),
  );
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [comment, setComment] = useState("");

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["tasks"] });
    void qc.invalidateQueries({ queryKey: ["task", taskDetailId] });
    void qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const save = useMutation({
    mutationFn: () =>
      fetchJson(`/api/tasks/${taskDetailId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          status,
          priority,
          projectId: projectId || null,
          dueDate: dueDate
            ? new Date(`${dueDate}T12:00:00`).toISOString()
            : null,
          tagIds,
        }),
      }),
    onSuccess: () => {
      invalidate();
      if (status === "DONE" && task.status !== "DONE") {
        playSuccessChime();
      }
      toast.success("Görev kaydedildi");
    },
    onError: (error) => toast.error(error.message),
  });

  const addSubtask = useMutation({
    mutationFn: () =>
      fetchJson(`/api/tasks/${taskDetailId}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: subtaskTitle }),
      }),
    onSuccess: () => {
      setSubtaskTitle("");
      invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const toggleSubtask = (id: string, isCompleted: boolean) => {
    if (isCompleted) {
      playSuccessChime();
    }
    fetchJson(`/api/tasks/${taskDetailId}/subtasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCompleted }),
    })
      .then(invalidate)
      .catch((error) => toast.error(error.message));
  };

  const deleteSubtask = (id: string) => {
    fetchJson(`/api/tasks/${taskDetailId}/subtasks/${id}`, {
      method: "DELETE",
    })
      .then(invalidate)
      .catch((error) => toast.error(error.message));
  };

  const addComment = useMutation({
    mutationFn: () =>
      fetchJson(`/api/tasks/${taskDetailId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: comment }),
      }),
    onSuccess: () => {
      setComment("");
      invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const archive = () => {
    fetchJson(`/api/tasks/${taskDetailId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    })
      .then(() => {
        invalidate();
        onClose();
        toast.success("Görev arşivlendi");
      })
      .catch((error) => toast.error(error.message));
  };

  const isDeleted = Boolean(task.deletedAt);

  const restore = () => {
    fetchJson(`/api/tasks/${taskDetailId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restore: true }),
    })
      .then(() => {
        invalidate();
        onClose();
        toast.success("Görev geri yüklendi");
      })
      .catch((error) => toast.error(error.message));
  };

  const remove = () => {
    const isPermanent = isDeleted;
    if (
      isPermanent &&
      !confirm("Bu görev kalıcı olarak silinecek. Bu işlem geri alınamaz. Emin misiniz?")
    ) {
      return;
    }

    fetchJson(`/api/tasks/${taskDetailId}${isPermanent ? "?permanent=true" : ""}`, {
      method: "DELETE",
    })
      .then(() => {
        invalidate();
        onClose();
        playTrashSound();
        toast.success(isPermanent ? "Görev kalıcı olarak silindi" : "Görev çöp kutusuna taşındı");
      })
      .catch((error) => toast.error(error.message));
  };

  return (
    <div className="space-y-7 p-5 sm:p-6">
      <section className="space-y-4">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="w-full border-b bg-transparent pb-2 text-2xl font-semibold outline-none"
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as TaskStatus)}
            className="h-10 rounded-xl border bg-background px-3 text-sm"
          >
            <option value="TODO">Yapılacak</option>
            <option value="IN_PROGRESS">Devam ediyor</option>
            <option value="DONE">Tamamlandı</option>
          </select>

          <select
            value={priority}
            onChange={(event) =>
              setPriority(event.target.value as TaskPriority)
            }
            className="h-10 rounded-xl border bg-background px-3 text-sm"
          >
            <option value="LOW">Düşük</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">Yüksek</option>
            <option value="CRITICAL">Kritik</option>
          </select>

          <input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            className="h-10 rounded-xl border bg-background px-3 text-sm"
          />
        </div>

        <select
          value={projectId}
          onChange={(event) => setProjectId(event.target.value)}
          className="h-10 w-full rounded-xl border bg-background px-3 text-sm"
        >
          <option value="">Proje yok</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>

        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                type="button"
                key={tag.id}
                onClick={() =>
                  setTagIds((current) =>
                    current.includes(tag.id)
                      ? current.filter((id) => id !== tag.id)
                      : [...current, tag.id],
                  )
                }
                className={`rounded-full border px-3 py-1 text-xs ${
                  tagIds.includes(tag.id)
                    ? "bg-primary text-primary-foreground"
                    : "bg-background"
                }`}
              >
                #{tag.name}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-semibold">Açıklama</h3>
          <span className="text-xs text-muted-foreground">
            Markdown destekli
          </span>
        </div>

        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={7}
          placeholder="Notlar, bağlantılar, checklist açıklamaları..."
          className="w-full resize-y rounded-xl border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />

        {description ? (
          <div className="markdown mt-3 rounded-xl border bg-muted/30 p-4 text-sm">
            <ReactMarkdown>{description}</ReactMarkdown>
          </div>
        ) : null}
      </section>

      <section>
        <h3 className="font-semibold">Alt görevler</h3>

        <form
          className="mt-3 flex gap-2"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            if (subtaskTitle.trim()) addSubtask.mutate();
          }}
        >
          <input
            value={subtaskTitle}
            onChange={(event) => setSubtaskTitle(event.target.value)}
            placeholder="Alt görev ekle"
            className="h-10 flex-1 rounded-xl border bg-background px-3 text-sm outline-none"
          />
          <Button type="submit" size="icon" disabled={addSubtask.isPending}>
            <Plus className="size-4" />
          </Button>
        </form>

        <div className="mt-3 space-y-2">
          {task.subtasks.map((subtask) => (
            <div
              key={subtask.id}
              className="flex items-center gap-3 rounded-xl border p-3"
            >
              <button
                type="button"
                onClick={() =>
                  toggleSubtask(subtask.id, !subtask.isCompleted)
                }
                className={`grid size-5 place-items-center rounded-md border ${
                  subtask.isCompleted
                    ? "bg-primary text-primary-foreground"
                    : ""
                }`}
                aria-label={
                  subtask.isCompleted
                    ? "Alt görevi tamamlanmadı olarak işaretle"
                    : "Alt görevi tamamlandı olarak işaretle"
                }
              >
                {subtask.isCompleted ? <Check className="size-3" /> : null}
              </button>

              <span
                className={`flex-1 text-sm ${
                  subtask.isCompleted
                    ? "text-muted-foreground line-through"
                    : ""
                }`}
              >
                {subtask.title}
              </span>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => deleteSubtask(subtask.id)}
                aria-label="Alt görevi sil"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="flex items-center gap-2 font-semibold">
          <MessageSquare className="size-4" />
          Yorumlar
        </h3>

        <form
          className="mt-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (comment.trim()) addComment.mutate();
          }}
        >
          <input
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Yorum ekle..."
            className="h-10 flex-1 rounded-xl border bg-background px-3 text-sm outline-none"
          />
          <Button type="submit" disabled={addComment.isPending}>
            Ekle
          </Button>
        </form>

        <div className="mt-3 space-y-2">
          {task.comments.map((taskComment) => (
            <div
              key={taskComment.id}
              className="rounded-xl bg-muted/50 p-3 text-sm"
            >
              <p>{taskComment.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(taskComment.createdAt).toLocaleString("tr-TR")}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
        <div className="flex gap-2">
          {isDeleted ? (
            <>
              <Button type="button" variant="outline" onClick={restore}>
                <RotateCcw className="size-4 mr-1.5" />
                Geri Yükle
              </Button>
              <Button type="button" variant="destructive" onClick={remove}>
                <Trash2 className="size-4 mr-1.5" />
                Kalıcı Sil
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={archive}>
                <Archive className="size-4 mr-1.5" />
                Arşivle
              </Button>
              <Button type="button" variant="destructive" onClick={remove}>
                <Trash2 className="size-4 mr-1.5" />
                Çöpe Taşı
              </Button>
            </>
          )}
        </div>

        <Button
          type="button"
          onClick={() => save.mutate()}
          disabled={save.isPending || !title.trim()}
        >
          {save.isPending ? "Kaydediliyor..." : "Değişiklikleri kaydet"}
        </Button>
      </div>
    </div>
  );
}

export function TaskDetailModal() {
  const { taskDetailId, setTaskDetailId } = useUIStore();

  const taskQuery = useQuery({
    queryKey: ["task", taskDetailId],
    queryFn: () =>
      fetchJson<{ task: TaskDTO }>(`/api/tasks/${taskDetailId}`),
    enabled: Boolean(taskDetailId),
  });

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: () => fetchJson<{ projects: ProjectDTO[] }>("/api/projects"),
    enabled: Boolean(taskDetailId),
  });

  const tagsQuery = useQuery({
    queryKey: ["tags"],
    queryFn: () => fetchJson<{ tags: TagDTO[] }>("/api/tags"),
    enabled: Boolean(taskDetailId),
  });

  if (!taskDetailId) return null;

  const task = taskQuery.data?.task;
  const close = () => setTaskDetailId(null);

  return (
    <div
      className="fixed inset-0 z-[65] flex justify-end bg-black/35"
      onMouseDown={close}
    >
      <aside
        className="h-full w-full max-w-2xl overflow-y-auto border-l bg-card shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-card/95 p-4 backdrop-blur">
          <div>
            <p className="text-xs font-medium text-primary">Görev detayı</p>
            <h2 className="font-semibold">
              {task?.title ?? "Yükleniyor..."}
            </h2>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={close}
            aria-label="Görev detayını kapat"
          >
            <X className="size-4" />
          </Button>
        </div>

        {taskQuery.isError ? (
          <div className="p-6 text-sm text-destructive">
            Görev yüklenirken bir hata oluştu.
          </div>
        ) : task ? (
          <TaskDetailEditor
            key={task.id}
            task={task}
            taskDetailId={taskDetailId}
            projects={projectsQuery.data?.projects ?? []}
            tags={tagsQuery.data?.tags ?? []}
            onClose={close}
          />
        ) : (
          <div className="space-y-3 p-6">
            <div className="h-8 w-2/3 animate-pulse rounded-lg bg-muted" />
            <div className="h-24 animate-pulse rounded-xl bg-muted" />
            <div className="h-40 animate-pulse rounded-xl bg-muted" />
          </div>
        )}
      </aside>
    </div>
  );
}
