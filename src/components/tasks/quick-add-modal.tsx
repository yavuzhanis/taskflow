"use client";

import {
  useEffect,
  useState,
} from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  CalendarDays,
  Command,
  Folder,
  Repeat2,
  Tag,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { fetchJson } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import type {
  ProjectDTO,
  RecurrenceFrequency,
  TagDTO,
  TaskDTO,
  TaskPriority,
  UserSummaryDTO,
} from "@/types/task";

export function QuickAddModal() {
  const {
    quickAddOpen,
    setQuickAddOpen,
  } = useUIStore();

  const qc =
    useQueryClient();

  const [
    title,
    setTitle,
  ] = useState("");

  const [
    priority,
    setPriority,
  ] =
    useState<TaskPriority>(
      "NORMAL",
    );

  const [
    dueDate,
    setDueDate,
  ] = useState("");

  const [
    projectId,
    setProjectId,
  ] = useState("");

  const [
    assignedToId,
    setAssignedToId,
  ] = useState("");

  const [
    recurrenceFrequency,
    setRecurrenceFrequency,
  ] =
    useState<RecurrenceFrequency>(
      "NONE",
    );

  const [
    tagIds,
    setTagIds,
  ] = useState<string[]>([]);

  useEffect(() => {
    if (!quickAddOpen) {
      return;
    }

    const onKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (
        event.key === "Escape"
      ) {
        setQuickAddOpen(false);
      }
    };

    window.addEventListener(
      "keydown",
      onKeyDown,
    );

    return () =>
      window.removeEventListener(
        "keydown",
        onKeyDown,
      );
  }, [
    quickAddOpen,
    setQuickAddOpen,
  ]);

  const projects =
    useQuery({
      queryKey: [
        "projects",
      ],
      queryFn: () =>
        fetchJson<{
          projects: ProjectDTO[];
        }>("/api/projects"),
      enabled:
        quickAddOpen,
    });

  const tags =
    useQuery({
      queryKey: ["tags"],
      queryFn: () =>
        fetchJson<{
          tags: TagDTO[];
        }>("/api/tags"),
      enabled:
        quickAddOpen,
    });

  const users =
    useQuery({
      queryKey: ["users"],
      queryFn: () =>
        fetchJson<{
          users: UserSummaryDTO[];
        }>("/api/users"),
      enabled:
        quickAddOpen,
    });

  const create =
    useMutation({
      mutationFn: () =>
        fetchJson<{
          task: TaskDTO;
        }>("/api/tasks", {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            title,
            priority,
            projectId:
              projectId || null,
            assignedToId:
              assignedToId ||
              null,
            recurrenceFrequency,
            dueDate: dueDate
              ? new Date(
                  `${dueDate}T12:00:00`,
                ).toISOString()
              : null,
            tagIds,
          }),
        }),

      onSuccess: () => {
        void qc.invalidateQueries({
          queryKey: ["tasks"],
        });

        void qc.invalidateQueries({
          queryKey: [
            "dashboard",
          ],
        });

        setTitle("");
        setDueDate("");
        setProjectId("");
        setAssignedToId("");
        setRecurrenceFrequency(
          "NONE",
        );
        setTagIds([]);
        setPriority("NORMAL");
        setQuickAddOpen(false);

        toast.success(
          "Görev eklendi",
        );
      },

      onError: (error) =>
        toast.error(
          error.message,
        ),
    });

  if (!quickAddOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex justify-center bg-black/55 px-4 pt-[10vh] backdrop-blur-sm"
      onMouseDown={() =>
        setQuickAddOpen(false)
      }
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-add-title"
        className="h-fit w-full max-w-2xl overflow-hidden rounded-xl border border-white/10 bg-background shadow-[0_24px_80px_rgba(0,0,0,.35)]"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="grid size-7 place-items-center rounded-lg border border-border/70 bg-muted/40">
              <Command className="size-3.5 text-muted-foreground" />
            </div>

            <div>
              <h2
                id="quick-add-title"
                className="text-sm font-semibold"
              >
                Hızlı görev
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Enter ile kaydet · Esc
                ile kapat
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() =>
              setQuickAddOpen(
                false,
              )
            }
            aria-label="Kapat"
          >
            <X className="size-4" />
          </Button>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();

            if (title.trim()) {
              create.mutate();
            }
          }}
        >
          <div className="p-4">
            <input
              autoFocus
              value={title}
              onChange={(event) =>
                setTitle(
                  event.target.value,
                )
              }
              placeholder="Ne yapılması gerekiyor?"
              className="h-14 w-full border-0 bg-transparent px-1 text-xl font-medium tracking-[-0.02em] outline-none placeholder:text-muted-foreground/55"
            />

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <label className="relative">
                <span className="sr-only">
                  Öncelik
                </span>
                <select
                  value={priority}
                  onChange={(event) =>
                    setPriority(
                      event.target
                        .value as TaskPriority,
                    )
                  }
                  className="h-10 w-full appearance-none rounded-lg border border-border/70 bg-muted/25 px-3 text-xs outline-none transition hover:bg-muted/45 focus:ring-2 focus:ring-ring/40"
                >
                  <option value="LOW">
                    Düşük öncelik
                  </option>
                  <option value="NORMAL">
                    Normal öncelik
                  </option>
                  <option value="HIGH">
                    Yüksek öncelik
                  </option>
                  <option value="CRITICAL">
                    Kritik öncelik
                  </option>
                </select>
              </label>

              <label className="relative">
                <Folder className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <select
                  value={projectId}
                  onChange={(event) =>
                    setProjectId(
                      event.target.value,
                    )
                  }
                  className="h-10 w-full appearance-none rounded-lg border border-border/70 bg-muted/25 pl-9 pr-3 text-xs outline-none transition hover:bg-muted/45 focus:ring-2 focus:ring-ring/40"
                >
                  <option value="">
                    Proje yok
                  </option>

                  {projects.data?.projects.map(
                    (project) => (
                      <option
                        key={
                          project.id
                        }
                        value={
                          project.id
                        }
                      >
                        {project.name}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <select
                  value={assignedToId}
                  onChange={(event) =>
                    setAssignedToId(
                      event.target.value,
                    )
                  }
                  className="h-10 w-full appearance-none rounded-lg border border-border/70 bg-muted/25 pl-9 pr-3 text-xs outline-none transition hover:bg-muted/45 focus:ring-2 focus:ring-ring/40"
                >
                  <option value="">
                    Atanmamış
                  </option>

                  {users.data?.users.map(
                    (workspaceUser) => (
                      <option
                        key={
                          workspaceUser.id
                        }
                        value={
                          workspaceUser.id
                        }
                      >
                        {workspaceUser.name ||
                          workspaceUser.email}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="relative">
                <Repeat2 className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <select
                  value={
                    recurrenceFrequency
                  }
                  onChange={(event) =>
                    setRecurrenceFrequency(
                      event.target
                        .value as RecurrenceFrequency,
                    )
                  }
                  className="h-10 w-full appearance-none rounded-lg border border-border/70 bg-muted/25 pl-9 pr-3 text-xs outline-none transition hover:bg-muted/45 focus:ring-2 focus:ring-ring/40"
                >
                  <option value="NONE">
                    Tekrar yok
                  </option>
                  <option value="DAILY">
                    Günlük
                  </option>
                  <option value="WEEKLY">
                    Haftalık
                  </option>
                  <option value="MONTHLY">
                    Aylık
                  </option>
                </select>
              </label>

              <label className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) =>
                    setDueDate(
                      event.target.value,
                    )
                  }
                  className="h-10 w-full rounded-lg border border-border/70 bg-muted/25 pl-9 pr-3 text-xs outline-none transition hover:bg-muted/45 focus:ring-2 focus:ring-ring/40"
                />
              </label>
            </div>

            {tags.data?.tags
              .length ? (
              <div className="mt-4 rounded-lg border border-border/60 bg-muted/15 p-3">
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                  <Tag className="size-3" />
                  Etiketler
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {tags.data.tags.map(
                    (tag) => {
                      const active =
                        tagIds.includes(
                          tag.id,
                        );

                      return (
                        <button
                          type="button"
                          key={tag.id}
                          aria-pressed={
                            active
                          }
                          onClick={() =>
                            setTagIds(
                              (
                                current,
                              ) =>
                                active
                                  ? current.filter(
                                      (
                                        id,
                                      ) =>
                                        id !==
                                        tag.id,
                                    )
                                  : [
                                      ...current,
                                      tag.id,
                                    ],
                            )
                          }
                          className={`rounded-md border px-2.5 py-1 text-[11px] transition ${
                            active
                              ? "border-foreground bg-foreground text-background"
                              : "border-border/70 bg-background text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          #{tag.name}
                        </button>
                      );
                    },
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between border-t border-border/70 bg-muted/20 px-4 py-3">
            <p className="text-[11px] text-muted-foreground">
              Daha sonra görev
              detayından açıklama ve
              alt görev ekleyebilirsin.
            </p>

            <Button
              disabled={
                !title.trim() ||
                create.isPending
              }
            >
              {create.isPending
                ? "Ekleniyor..."
                : "Görevi ekle"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
