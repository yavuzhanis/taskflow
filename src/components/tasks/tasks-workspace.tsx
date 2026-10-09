"use client";

import {
  InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Archive,
  Bookmark,
  BookmarkPlus,
  CalendarDays,
  Check,
  CheckSquare2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Download,
  FileSpreadsheet,
  Filter,
  List,
  Plus,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import {
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

import { KanbanBoard } from "@/components/tasks/kanban-board";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { playSuccessChime, playTrashSound } from "@/lib/audio";
import {
  fetchJson,
  formatDate,
} from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import type {
  ProjectDTO,
  TagDTO,
  TaskDTO,
  TaskPriority,
  TaskStatus,
  TasksResponse,
} from "@/types/task";

const priorityOrder = {
  CRITICAL: 4,
  HIGH: 3,
  NORMAL: 2,
  LOW: 1,
} as const;

const statusOrder = {
  TODO: 1,
  IN_PROGRESS: 2,
  DONE: 3,
} as const;

const priorityLabel = {
  LOW: "Düşük",
  NORMAL: "Normal",
  HIGH: "Yüksek",
  CRITICAL: "Kritik",
} as const;

const priorityDot = {
  LOW: "bg-zinc-400",
  NORMAL: "bg-blue-500",
  HIGH: "bg-amber-500",
  CRITICAL: "bg-red-500",
} as const;

type Mode =
  | "active"
  | "archived"
  | "trash";

type ViewMode =
  | "list"
  | "kanban"
  | "calendar";

type ReorderItem = {
  id: string;
  status: TaskStatus;
  position: number;
};

type BulkAction =
  | {
      action: "status";
      status: TaskStatus;
    }
  | {
      action:
        | "archive"
        | "trash"
        | "restoreArchive"
        | "restoreTrash"
        | "deletePermanent";
    };

type SavedViewDTO = {
  id: string;
  name: string;
  filters: {
    mode: Mode;
    smart: string;
    status: string;
    projectId: string;
    tagId: string;
    sort: string;
    view: ViewMode;
  };
};

type TaskTemplateDTO = {
  id: string;
  name: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueOffsetDays: number | null;
};

const weekDays = [
  "Pzt",
  "Sal",
  "Çar",
  "Per",
  "Cum",
  "Cmt",
  "Paz",
];

const monthFormatter =
  new Intl.DateTimeFormat(
    "tr-TR",
    {
      month: "long",
      year: "numeric",
    },
  );

function dateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export function TasksWorkspace({
  initialSearch = "",
  initialProjectId = "",
  initialTagId = "",
  initialSmart = "",
  initialStatus = "",
  initialMode = "active",
}: {
  initialSearch?: string;
  initialProjectId?: string;
  initialTagId?: string;
  initialSmart?: string;
  initialStatus?: string;
  initialMode?: Mode;
}) {
  const qc = useQueryClient();

  const setTaskDetailId =
    useUIStore(
      (state) =>
        state.setTaskDetailId,
    );

  const setQuickAddOpen =
    useUIStore(
      (state) =>
        state.setQuickAddOpen,
    );

  const [
    viewOverride,
    setViewOverride,
  ] = useState<ViewMode | null>(
    null,
  );

  const [
    smart,
    setSmart,
  ] = useState(initialSmart);

  const [
    status,
    setStatus,
  ] = useState(initialStatus);

  const [
    projectId,
    setProjectId,
  ] = useState(initialProjectId);

  const [
    tagId,
    setTagId,
  ] = useState(initialTagId);

  const [
    mode,
    setMode,
  ] =
    useState<Mode>(initialMode);

  const [prevInitial, setPrevInitial] = useState({
    projectId: initialProjectId,
    tagId: initialTagId,
    smart: initialSmart,
    status: initialStatus,
    mode: initialMode,
  });

  if (
    prevInitial.projectId !== initialProjectId ||
    prevInitial.tagId !== initialTagId ||
    prevInitial.smart !== initialSmart ||
    prevInitial.status !== initialStatus ||
    prevInitial.mode !== initialMode
  ) {
    setPrevInitial({
      projectId: initialProjectId,
      tagId: initialTagId,
      smart: initialSmart,
      status: initialStatus,
      mode: initialMode,
    });
    setProjectId(initialProjectId);
    setTagId(initialTagId);
    setSmart(initialSmart);
    setStatus(initialStatus);
    setMode(initialMode);
  }

  const [
    sort,
    setSort,
  ] = useState("created");

  const [
    selectedIds,
    setSelectedIds,
  ] = useState<Set<string>>(
    () => new Set(),
  );

  const [
    calendarMonth,
    setCalendarMonth,
  ] = useState(
    () => new Date(),
  );

  const [
    selectedSavedViewId,
    setSelectedSavedViewId,
  ] = useState("");

  const [
    selectedTemplateId,
    setSelectedTemplateId,
  ] = useState("");

  const clearSelection = () =>
    setSelectedIds(new Set());

  const queryString =
    new URLSearchParams({
      ...(initialSearch
        ? {
            q: initialSearch,
          }
        : {}),
      ...(smart &&
      mode === "active"
        ? {
            smart,
          }
        : {}),
      ...(status
        ? {
            status,
          }
        : {}),
      ...(projectId
        ? {
            projectId,
          }
        : {}),
      ...(tagId
        ? {
            tagId,
          }
        : {}),
      ...(mode === "archived"
        ? {
            archived: "true",
          }
        : {}),
      ...(mode === "trash"
        ? {
            trash: "true",
          }
        : {}),
    }).toString();

  const tasksQ =
    useInfiniteQuery({
      queryKey: [
        "tasks",
        queryString,
      ],
      initialPageParam:
        null as string | null,
      queryFn: ({
        pageParam,
      }) => {
        const params =
          new URLSearchParams(
            queryString,
          );

        params.set(
          "limit",
          "100",
        );

        if (pageParam) {
          params.set(
            "cursor",
            pageParam,
          );
        }

        return fetchJson<TasksResponse>(
          `/api/tasks?${params.toString()}`,
        );
      },
      getNextPageParam: (
        lastPage,
      ) =>
        lastPage.pagination?.nextCursor ??
        undefined,
    });

  const preferences =
    useQuery({
      queryKey: [
        "preferences",
      ],
      queryFn: () =>
        fetchJson<{
          preferences: {
            defaultView:
              | "LIST"
              | "KANBAN";
          };
        }>("/api/preferences"),
    });

  const projects =
    useQuery({
      queryKey: [
        "projects",
      ],
      queryFn: () =>
        fetchJson<{
          projects: ProjectDTO[];
        }>("/api/projects"),
    });

  const tags =
    useQuery({
      queryKey: ["tags"],
      queryFn: () =>
        fetchJson<{
          tags: TagDTO[];
        }>("/api/tags"),
    });

  const savedViews =
    useQuery({
      queryKey: [
        "saved-views",
      ],
      queryFn: () =>
        fetchJson<{
          views: SavedViewDTO[];
        }>("/api/saved-views"),
    });

  const templates =
    useQuery({
      queryKey: [
        "task-templates",
      ],
      queryFn: () =>
        fetchJson<{
          templates: TaskTemplateDTO[];
        }>("/api/task-templates"),
    });

  const preferredView:
    ViewMode =
    preferences.data
      ?.preferences
      .defaultView ===
    "KANBAN"
      ? "kanban"
      : "list";

  const view =
    viewOverride ??
    preferredView;

  const rawTasks =
    useMemo(
      () =>
        tasksQ.data?.pages.flatMap(
          (page) =>
            page.tasks,
        ) ?? [],
      [tasksQ.data],
    );

  const tasks =
    useMemo(() => {
      const items = [
        ...rawTasks,
      ];

      if (sort === "due") {
        items.sort(
          (a, b) =>
            (a.dueDate
              ? new Date(
                  a.dueDate,
                ).getTime()
              : Infinity) -
            (b.dueDate
              ? new Date(
                  b.dueDate,
                ).getTime()
              : Infinity),
        );
      }

      if (
        sort === "priority"
      ) {
        items.sort(
          (a, b) =>
            priorityOrder[
              b.priority
            ] -
            priorityOrder[
              a.priority
            ],
        );
      }

      if (sort === "title") {
        items.sort((a, b) =>
          a.title.localeCompare(
            b.title,
            "tr",
          ),
        );
      }

      if (sort === "status") {
        items.sort(
          (a, b) =>
            statusOrder[
              a.status
            ] -
            statusOrder[
              b.status
            ],
        );
      }

      return items;
    }, [rawTasks, sort]);

  const visibleTaskIds =
    useMemo(
      () =>
        tasks.map(
          (task) => task.id,
        ),
      [tasks],
    );

  const calendarDays =
    useMemo(() => {
      const firstDay =
        new Date(
          calendarMonth.getFullYear(),
          calendarMonth.getMonth(),
          1,
        );
      const mondayOffset =
        (firstDay.getDay() + 6) %
        7;
      const start =
        new Date(firstDay);
      start.setDate(
        firstDay.getDate() -
          mondayOffset,
      );

      return Array.from(
        { length: 42 },
        (_, index) => {
          const date =
            new Date(start);
          date.setDate(
            start.getDate() +
              index,
          );
          return date;
        },
      );
    }, [calendarMonth]);

  const tasksByDate =
    useMemo(() => {
      const map =
        new Map<
          string,
          TaskDTO[]
        >();

      tasks.forEach((task) => {
        if (!task.dueDate) {
          return;
        }

        const key = dateKey(
          new Date(
            task.dueDate,
          ),
        );
        const list =
          map.get(key) ?? [];
        list.push(task);
        map.set(key, list);
      });

      return map;
    }, [tasks]);

  const selectedCount =
    selectedIds.size;

  const selectedSavedView =
    savedViews.data?.views.find(
      (item) =>
        item.id ===
        selectedSavedViewId,
    );

  const selectedTemplate =
    templates.data?.templates.find(
      (item) =>
        item.id ===
        selectedTemplateId,
    );

  const allVisibleSelected =
    visibleTaskIds.length >
      0 &&
    visibleTaskIds.every((id) =>
      selectedIds.has(id),
    );

  const toggleTaskSelection = (
    id: string,
  ) => {
    setSelectedIds(
      (current) => {
        const next =
          new Set(current);

        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }

        return next;
      },
    );
  };

  const toggleVisibleSelection =
    () => {
      setSelectedIds(
        (current) => {
          const next =
            new Set(current);

          if (
            allVisibleSelected
          ) {
            visibleTaskIds.forEach(
              (id) =>
                next.delete(
                  id,
                ),
            );
          } else {
            visibleTaskIds.forEach(
              (id) =>
                next.add(id),
            );
          }

          return next;
        },
      );
    };

  const updateTaskInCache = (
    updater: (
      task: TaskDTO,
    ) => TaskDTO,
  ) => {
    qc.setQueryData<
      InfiniteData<TasksResponse>
    >(
      [
        "tasks",
        queryString,
      ],
      (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          pages:
            current.pages.map(
              (page) => ({
                ...page,
                tasks:
                  page.tasks.map(
                    updater,
                  ),
              }),
            ),
        };
      },
    );
  };

  const move =
    useMutation({
      mutationFn: ({
        id,
        status:
          nextStatus,
      }: {
        id: string;
        status: TaskStatus;
      }) =>
        fetchJson<{
          task: TaskDTO;
        }>(
          `/api/tasks/${id}`,
          {
            method:
              "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              status:
                nextStatus,
            }),
          },
        ),

      onMutate: async ({
        id,
        status:
          nextStatus,
      }) => {
        await qc.cancelQueries({
          queryKey: [
            "tasks",
            queryString,
          ],
        });

        const previous =
          qc.getQueryData<
            InfiniteData<TasksResponse>
          >([
            "tasks",
            queryString,
          ]);

        updateTaskInCache(
          (task) =>
            task.id === id
              ? {
                  ...task,
                  status:
                    nextStatus,
                }
              : task,
        );

        return {
          previous,
        };
      },

      onSuccess: (
        _,
        variables,
      ) => {
        if (
          variables.status ===
          "DONE"
        ) {
          playSuccessChime();
        }
      },

      onError: (
        error,
        _,
        context,
      ) => {
        if (
          context?.previous
        ) {
          qc.setQueryData(
            [
              "tasks",
              queryString,
            ],
            context.previous,
          );
        }

        toast.error(
          error.message,
        );
      },

      onSettled: () => {
        void qc.invalidateQueries({
          queryKey: ["tasks"],
        });

        void qc.invalidateQueries({
          queryKey: [
            "dashboard",
          ],
        });
      },
    });

  const reorder =
    useMutation({
      mutationFn: (
        items: ReorderItem[],
      ) =>
        fetchJson<{
          ok: boolean;
        }>(
          "/api/tasks/reorder",
          {
            method:
              "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              items,
            }),
          },
        ),

      onMutate: async (
        items,
      ) => {
        await qc.cancelQueries({
          queryKey: [
            "tasks",
            queryString,
          ],
        });

        const previous =
          qc.getQueryData<
            InfiniteData<TasksResponse>
          >([
            "tasks",
            queryString,
          ]);

        const map =
          new Map(
            items.map(
              (item) => [
                item.id,
                item,
              ],
            ),
          );

        updateTaskInCache(
          (task) => {
            const next =
              map.get(
                task.id,
              );

            if (!next) {
              return task;
            }

            return {
              ...task,
              status:
                next.status,
              position:
                next.position,
            };
          },
        );

        return {
          previous,
        };
      },

      onError: (
        error,
        _,
        context,
      ) => {
        if (
          context?.previous
        ) {
          qc.setQueryData(
            [
              "tasks",
              queryString,
            ],
            context.previous,
          );
        }

        toast.error(
          error.message,
        );
      },

      onSettled: () => {
        void qc.invalidateQueries({
          queryKey: ["tasks"],
        });

        void qc.invalidateQueries({
          queryKey: [
            "dashboard",
          ],
        });
      },
    });

  const restoreArchive = (
    id: string,
  ) => {
    fetchJson(
      `/api/tasks/${id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          archived: false,
        }),
      },
    )
      .then(() => {
        void qc.invalidateQueries({
          queryKey: ["tasks"],
        });

        toast.success(
          "Görev arşivden çıkarıldı",
        );
      })
      .catch((error) =>
        toast.error(
          error.message,
        ),
      );
  };

  const restoreTrash = (
    id: string,
  ) => {
    fetchJson(
      `/api/tasks/${id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          restore: true,
        }),
      },
    )
      .then(() => {
        void qc.invalidateQueries({
          queryKey: ["tasks"],
        });

        toast.success(
          "Görev geri yüklendi",
        );
      })
      .catch((error) =>
        toast.error(
          error.message,
        ),
      );
  };

  const permanentDelete = (
    id: string,
  ) => {
    if (
      !confirm(
        "Bu görev kalıcı olarak silinecek. Bu işlem geri alınamaz.",
      )
    ) {
      return;
    }

    fetchJson(
      `/api/tasks/${id}?permanent=true`,
      {
        method: "DELETE",
      },
    )
      .then(() => {
        void qc.invalidateQueries({
          queryKey: ["tasks"],
        });

        playTrashSound();
        toast.success(
          "Görev kalıcı olarak silindi",
        );
      })
      .catch((error) =>
        toast.error(
          error.message,
        ),
      );
  };

  const bulk =
    useMutation({
      mutationFn: (
        payload: BulkAction & {
          ids: string[];
        },
      ) =>
        fetchJson<{
          count: number;
        }>(
          "/api/tasks/bulk",
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(
              payload,
            ),
          },
        ),

      onSuccess: (
        data,
        variables,
      ) => {
        setSelectedIds(
          new Set(),
        );

        void qc.invalidateQueries({
          queryKey: ["tasks"],
        });

        void qc.invalidateQueries({
          queryKey: [
            "dashboard",
          ],
        });

        void qc.invalidateQueries({
          queryKey: [
            "notifications",
          ],
        });

        if (
          variables.action ===
            "trash" ||
          variables.action ===
            "deletePermanent"
        ) {
          playTrashSound();
        }

        if (
          variables.action ===
            "status" &&
          variables.status ===
            "DONE"
        ) {
          playSuccessChime();
        }

        toast.success(
          `${data.count} görev güncellendi`,
        );
      },

      onError: (error) =>
        toast.error(
          error.message,
        ),
    });

  const runBulkAction = (
    action: BulkAction,
  ) => {
    const ids = Array.from(
      selectedIds,
    );

    if (!ids.length) {
      return;
    }

    if (
      action.action ===
        "deletePermanent" &&
      !confirm(
        "Seçili görevler kalıcı olarak silinecek. Bu işlem geri alınamaz.",
      )
    ) {
      return;
    }

    bulk.mutate({
      ...action,
      ids,
    });
  };

  const saveView =
    useMutation({
      mutationFn: (
        name: string,
      ) =>
        fetchJson<{
          view: SavedViewDTO;
        }>(
          "/api/saved-views",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              name,
              filters: {
                mode,
                smart,
                status,
                projectId,
                tagId,
                sort,
                view,
              },
            }),
          },
        ),
      onSuccess: () => {
        setSelectedSavedViewId("");
        void qc.invalidateQueries({
          queryKey: [
            "saved-views",
          ],
        });
        toast.success(
          "Görünüm kaydedildi",
        );
      },
      onError: (error) =>
        toast.error(
          error.message,
        ),
    });

  const deleteView =
    useMutation({
      mutationFn: (id: string) =>
        fetchJson(
          `/api/saved-views?id=${encodeURIComponent(id)}`,
          {
            method: "DELETE",
          },
        ),
      onSuccess: () => {
        void qc.invalidateQueries({
          queryKey: [
            "saved-views",
          ],
        });
        toast.success(
          "Görünüm silindi",
        );
      },
      onError: (error) =>
        toast.error(
          error.message,
        ),
    });

  const createFromTemplate =
    useMutation({
      mutationFn: (
        template: TaskTemplateDTO,
      ) => {
        const dueDate =
          template.dueOffsetDays ===
            null ||
          template.dueOffsetDays ===
            undefined
            ? null
            : (() => {
                const date =
                  new Date();
                date.setDate(
                  date.getDate() +
                    template.dueOffsetDays,
                );
                date.setHours(
                  12,
                  0,
                  0,
                  0,
                );
                return date.toISOString();
              })();

        return fetchJson<{
          task: TaskDTO;
        }>("/api/tasks", {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            title:
              template.title,
            description:
              template.description,
            priority:
              template.priority,
            status:
              template.status,
            dueDate,
          }),
        });
      },
      onSuccess: () => {
        void qc.invalidateQueries({
          queryKey: ["tasks"],
        });
        void qc.invalidateQueries({
          queryKey: [
            "dashboard",
          ],
        });
        toast.success(
          "Şablondan görev oluşturuldu",
        );
      },
      onError: (error) =>
        toast.error(
          error.message,
        ),
    });

  const handleSaveView = () => {
    const name = prompt(
      "Bu görünüm için bir ad yazın",
    )?.trim();

    if (name) {
      saveView.mutate(name);
    }
  };

  const applySavedView = (
    savedView: SavedViewDTO,
  ) => {
    clearSelection();
    setMode(
      savedView.filters.mode,
    );
    setSmart(
      savedView.filters.smart,
    );
    setStatus(
      savedView.filters.status,
    );
    setProjectId(
      savedView.filters.projectId,
    );
    setTagId(
      savedView.filters.tagId,
    );
    setSort(
      savedView.filters.sort,
    );
    setViewOverride(
      savedView.filters.view,
    );
    toast.success(
      "Görünüm uygulandı",
    );
  };

  const emptyTrash = () => {
    if (
      !confirm(
        "Çöp kutusundaki tüm görevler kalıcı olarak silinecek. Bu işlem geri alınamaz. Emin misiniz?",
      )
    ) {
      return;
    }

    fetchJson(
      "/api/tasks?emptyTrash=true",
      {
        method: "DELETE",
      },
    )
      .then(() => {
        void qc.invalidateQueries({
          queryKey: ["tasks"],
        });

        playTrashSound();
        toast.success(
          "Çöp kutusu boşaltıldı",
        );
      })
      .catch((error) =>
        toast.error(
          error.message,
        ),
      );
  };

  const total =
    tasksQ.data?.pages[0]?.pagination?.total ?? rawTasks.length;

  const filterClass =
    "h-9 rounded-lg border border-border/70 bg-background px-3 text-xs text-muted-foreground outline-none transition hover:bg-muted/40 focus:border-foreground/20 focus:ring-2 focus:ring-ring/30";

  const buildExportHref = (
    format: "csv" | "excel",
  ) => {
    const params =
      new URLSearchParams(
        queryString,
      );

    params.set(
      "format",
      format,
    );

    params.set(
      "scope",
      "view",
    );

    params.set(
      "sort",
      sort,
    );

    return `/api/export?${params.toString()}`;
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Tasks
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em]">
            Görevler
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Tüm işlerini tek
            noktadan planla,
            sırala ve tamamla.
          </p>
        </div>

        <Button
          onClick={() =>
            setQuickAddOpen(
              true,
            )
          }
        >
          <Plus className="size-3.5" />
          Yeni görev
        </Button>
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-xl border border-border/70 bg-card/50 p-2.5 xl:flex-row xl:items-center">
        <div className="flex rounded-lg border border-border/70 bg-muted/25 p-0.5">
          {(
            [
              [
                "active",
                "Aktif",
              ],
              [
                "archived",
                "Arşiv",
              ],
              [
                "trash",
                "Çöp",
              ],
            ] as [
              Mode,
              string,
            ][]
          ).map(
            ([
              value,
              label,
            ]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  clearSelection();
                  setMode(value);
                }}
                className={`h-8 rounded-md px-3 text-xs font-medium transition ${
                  mode === value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ),
          )}
        </div>

        <div className="hidden h-5 w-px bg-border xl:block" />

        <div className="flex flex-1 flex-wrap gap-2">
          {mode ===
            "active" && (
            <div className="relative">
              <Filter className="pointer-events-none absolute left-3 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
              <select
                value={smart}
                onChange={(
                  event,
                ) => {
                  clearSelection();
                  setSmart(
                    event.target
                      .value,
                  );
                }}
                className={`${filterClass} pl-8`}
              >
                <option value="">
                  Tüm tarihler
                </option>
                <option value="today">
                  Bugün
                </option>
                <option value="week">
                  Bu hafta
                </option>
                <option value="overdue">
                  Gecikenler
                </option>
              </select>
            </div>
          )}

          <select
            value={status}
            onChange={(event) => {
              clearSelection();
              setStatus(
                event.target.value,
              );
            }}
            className={
              filterClass
            }
          >
            <option value="">
              Tüm durumlar
            </option>
            <option value="TODO">
              Yapılacak
            </option>
            <option value="IN_PROGRESS">
              Devam ediyor
            </option>
            <option value="DONE">
              Tamamlandı
            </option>
          </select>

          <select
            value={projectId}
            onChange={(event) => {
              clearSelection();
              setProjectId(
                event.target.value,
              );
            }}
            className={
              filterClass
            }
          >
            <option value="">
              Tüm projeler
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

          <select
            value={tagId}
            onChange={(event) => {
              clearSelection();
              setTagId(
                event.target.value,
              );
            }}
            className={
              filterClass
            }
          >
            <option value="">
              Tüm etiketler
            </option>

            {tags.data?.tags.map(
              (tag) => (
                <option
                  key={tag.id}
                  value={tag.id}
                >
                  #{tag.name}
                </option>
              ),
            )}
          </select>

          <div className="relative">
            <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
            <select
              value={sort}
              onChange={(event) =>
                setSort(
                  event.target.value,
                )
              }
              className={`${filterClass} pl-8 pr-7`}
            >
              <option value="created">
                Oluşturma
              </option>
              <option value="due">
                Son tarih
              </option>
              <option value="priority">
                Öncelik
              </option>
              <option value="title">
                Başlık
              </option>
              <option value="status">
                Durum
              </option>
            </select>

            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        {mode ===
          "active" && (
          <div className="flex rounded-lg border border-border/70 bg-muted/25 p-0.5">
            <button
              type="button"
              onClick={() =>
                setViewOverride(
                  "list",
                )
              }
              className={`grid size-8 place-items-center rounded-md transition ${
                view ===
                "list"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label="Liste görünümü"
            >
              <List className="size-3.5" />
            </button>

            <button
              type="button"
              onClick={() =>
                setViewOverride(
                  "kanban",
                )
              }
              className={`grid size-8 place-items-center rounded-md transition ${
                view ===
                "kanban"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label="Kanban görünümü"
            >
              <Columns3 className="size-3.5" />
            </button>

            <button
              type="button"
              onClick={() =>
                setViewOverride(
                  "calendar",
                )
              }
              className={`grid size-8 place-items-center rounded-md transition ${
                view ===
                "calendar"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label="Takvim görünümü"
            >
              <CalendarDays className="size-3.5" />
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            asChild
            size="sm"
            variant="outline"
            className="h-8 px-2.5 text-xs"
          >
            <a
              href={buildExportHref(
                "csv",
              )}
              download
              title="Filtreli CSV indir"
            >
              <Download className="size-3.5" />
              CSV
            </a>
          </Button>

          <Button
            asChild
            size="sm"
            variant="outline"
            className="h-8 px-2.5 text-xs"
          >
            <a
              href={buildExportHref(
                "excel",
              )}
              download
              title="Filtreli Excel indir"
            >
              <FileSpreadsheet className="size-3.5 text-emerald-500" />
              Excel
            </a>
          </Button>
        </div>

        {mode === "trash" && rawTasks.length > 0 && (
          <Button
            size="sm"
            variant="destructive"
            onClick={emptyTrash}
            className="h-8 px-2.5 text-xs ml-auto shadow-2xs"
          >
            <Trash2 className="size-3.5 mr-1" />
            Çöpü Boşalt ({rawTasks.length})
          </Button>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2 rounded-xl border border-border/70 bg-card/40 p-2.5 lg:flex-row lg:items-center">
        <div className="flex flex-1 flex-wrap gap-2">
          <div className="relative">
            <Bookmark className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <select
              value={
                selectedSavedViewId
              }
              onChange={(event) =>
                setSelectedSavedViewId(
                  event.target.value,
                )
              }
              className={`${filterClass} min-w-[180px] pl-9`}
            >
              <option value="">
                Kayıtlı görünüm
              </option>
              {savedViews.data?.views.map(
                (item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.name}
                  </option>
                ),
              )}
            </select>
          </div>

          <Button
            size="sm"
            variant="outline"
            disabled={
              !selectedSavedView
            }
            onClick={() => {
              if (
                selectedSavedView
              ) {
                applySavedView(
                  selectedSavedView,
                );
              }
            }}
          >
            Uygula
          </Button>

          <Button
            size="sm"
            variant="ghost"
            disabled={
              !selectedSavedView ||
              deleteView.isPending
            }
            onClick={() => {
              if (
                selectedSavedView
              ) {
                deleteView.mutate(
                  selectedSavedView.id,
                );
              }
            }}
          >
            Sil
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={
              saveView.isPending
            }
            onClick={handleSaveView}
          >
            <BookmarkPlus className="size-3.5" />
            Görünümü kaydet
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Save className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <select
              value={
                selectedTemplateId
              }
              onChange={(event) =>
                setSelectedTemplateId(
                  event.target.value,
                )
              }
              className={`${filterClass} min-w-[190px] pl-9`}
            >
              <option value="">
                Görev şablonu
              </option>
              {templates.data?.templates.map(
                (template) => (
                  <option
                    key={template.id}
                    value={template.id}
                  >
                    {template.name}
                  </option>
                ),
              )}
            </select>
          </div>

          <Button
            size="sm"
            variant="outline"
            disabled={
              !selectedTemplate ||
              createFromTemplate.isPending
            }
            onClick={() => {
              if (
                selectedTemplate
              ) {
                createFromTemplate.mutate(
                  selectedTemplate,
                );
              }
            }}
          >
            <Plus className="size-3.5" />
            Oluştur
          </Button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        {mode ===
          "archived" ? (
          <Archive className="size-3.5" />
        ) : mode ===
          "trash" ? (
          <Trash2 className="size-3.5" />
        ) : (
          <List className="size-3.5" />
        )}

        <span>
          {total} görev
        </span>

        {initialSearch && (
          <>
            <span>·</span>
            <span className="truncate">
              “{initialSearch}”
              için sonuçlar
            </span>
          </>
        )}
      </div>

      {selectedCount > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-card/80 p-2.5 shadow-sm">
          <div className="mr-1 inline-flex items-center gap-2 rounded-lg bg-muted/45 px-3 py-1.5 text-xs font-medium">
            <CheckSquare2 className="size-3.5 text-primary" />
            {selectedCount} görev seçildi
          </div>

          {mode ===
            "active" && (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={
                  bulk.isPending
                }
                onClick={() =>
                  runBulkAction({
                    action:
                      "status",
                    status:
                      "TODO",
                  })
                }
              >
                Yapılacak
              </Button>

              <Button
                size="sm"
                variant="outline"
                disabled={
                  bulk.isPending
                }
                onClick={() =>
                  runBulkAction({
                    action:
                      "status",
                    status:
                      "IN_PROGRESS",
                  })
                }
              >
                Devam ediyor
              </Button>

              <Button
                size="sm"
                variant="outline"
                disabled={
                  bulk.isPending
                }
                onClick={() =>
                  runBulkAction({
                    action:
                      "status",
                    status:
                      "DONE",
                  })
                }
              >
                <Check className="size-3.5" />
                Tamamla
              </Button>

              <Button
                size="sm"
                variant="outline"
                disabled={
                  bulk.isPending
                }
                onClick={() =>
                  runBulkAction({
                    action:
                      "archive",
                  })
                }
              >
                <Archive className="size-3.5" />
                Arşivle
              </Button>

              <Button
                size="sm"
                variant="outline"
                disabled={
                  bulk.isPending
                }
                onClick={() =>
                  runBulkAction({
                    action:
                      "trash",
                  })
                }
              >
                <Trash2 className="size-3.5" />
                Çöpe taşı
              </Button>
            </>
          )}

          {mode ===
            "archived" && (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={
                  bulk.isPending
                }
                onClick={() =>
                  runBulkAction({
                    action:
                      "restoreArchive",
                  })
                }
              >
                <RotateCcw className="size-3.5" />
                Arşivden çıkar
              </Button>

              <Button
                size="sm"
                variant="outline"
                disabled={
                  bulk.isPending
                }
                onClick={() =>
                  runBulkAction({
                    action:
                      "trash",
                  })
                }
              >
                <Trash2 className="size-3.5" />
                Çöpe taşı
              </Button>
            </>
          )}

          {mode ===
            "trash" && (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={
                  bulk.isPending
                }
                onClick={() =>
                  runBulkAction({
                    action:
                      "restoreTrash",
                  })
                }
              >
                <RotateCcw className="size-3.5" />
                Geri yükle
              </Button>

              <Button
                size="sm"
                variant="destructive"
                disabled={
                  bulk.isPending
                }
                onClick={() =>
                  runBulkAction({
                    action:
                      "deletePermanent",
                  })
                }
              >
                <Trash2 className="size-3.5" />
                Kalıcı sil
              </Button>
            </>
          )}

          <Button
            size="sm"
            variant="ghost"
            className="ml-auto"
            disabled={bulk.isPending}
            onClick={() =>
              setSelectedIds(
                new Set(),
              )
            }
            aria-label="Seçimi temizle"
          >
            <X className="size-3.5" />
            Temizle
          </Button>
        </div>
      )}

      <section className="mt-4">
        {tasksQ.isLoading ? (
          <div className="space-y-2">
            {Array.from({
              length: 6,
            }).map(
              (_, index) => (
                <div
                  key={index}
                  className="h-16 animate-pulse rounded-xl border border-border/50 bg-muted/40"
                />
              ),
            )}
          </div>
        ) : !tasks.length ? (
          <EmptyState
            title="Görev bulunamadı"
            description={
              mode === "trash"
                ? "Çöp kutusu şu anda boş."
                : mode ===
                    "archived"
                  ? "Arşivlenmiş görev bulunmuyor."
                  : "Filtreleri değiştir veya yeni bir görev oluştur."
            }
          />
        ) : view ===
            "calendar" &&
          mode === "active" ? (
          <div className="overflow-hidden rounded-xl border border-border/70 bg-card/50">
            <div className="flex items-center justify-between border-b border-border/70 px-3 py-2.5">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={() =>
                  setCalendarMonth(
                    (current) =>
                      new Date(
                        current.getFullYear(),
                        current.getMonth() -
                          1,
                        1,
                      ),
                  )
                }
                aria-label="Önceki ay"
              >
                <ChevronLeft className="size-4" />
              </Button>

              <div className="text-sm font-semibold capitalize">
                {monthFormatter.format(
                  calendarMonth,
                )}
              </div>

              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={() =>
                  setCalendarMonth(
                    (current) =>
                      new Date(
                        current.getFullYear(),
                        current.getMonth() +
                          1,
                        1,
                      ),
                  )
                }
                aria-label="Sonraki ay"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>

            <div className="grid grid-cols-7 border-b border-border/70 bg-muted/20 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="px-2 py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {calendarDays.map((day) => {
                const key =
                  dateKey(day);
                const dayTasks =
                  tasksByDate.get(
                    key,
                  ) ?? [];
                const isCurrentMonth =
                  day.getMonth() ===
                  calendarMonth.getMonth();
                const isToday =
                  key ===
                  dateKey(new Date());

                return (
                  <div
                    key={key}
                    className={`min-h-[118px] border-b border-r border-border/60 p-2 last:border-r-0 ${
                      isCurrentMonth
                        ? "bg-background/35"
                        : "bg-muted/15 text-muted-foreground/65"
                    }`}
                  >
                    <div
                      className={`mb-2 flex size-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                        isToday
                          ? "bg-foreground text-background"
                          : ""
                      }`}
                    >
                      {day.getDate()}
                    </div>

                    <div className="space-y-1">
                      {dayTasks
                        .slice(0, 3)
                        .map((task) => (
                          <button
                            key={
                              task.id
                            }
                            type="button"
                            onClick={() =>
                              setTaskDetailId(
                                task.id,
                              )
                            }
                            className="block w-full truncate rounded-md border border-border/60 bg-card px-2 py-1 text-left text-[11px] font-medium text-foreground transition hover:border-primary/40 hover:bg-muted/40"
                          >
                            {task.title}
                          </button>
                        ))}

                      {dayTasks.length >
                        3 && (
                        <div className="px-1 text-[10px] text-muted-foreground">
                          +
                          {dayTasks.length -
                            3}{" "}
                          görev
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : view ===
            "kanban" &&
          mode === "active" ? (
          <div className="overflow-x-auto pb-3">
            <KanbanBoard
              tasks={tasks}
              onReorder={(
                items,
              ) =>
                reorder.mutate(
                  items,
                )
              }
            />
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/70 bg-card/50">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-border/70 bg-muted/20 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  <tr>
                    <th className="w-11 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={
                          allVisibleSelected
                        }
                        onChange={
                          toggleVisibleSelection
                        }
                        aria-label="Görünen görevleri seç"
                        className="size-4 rounded border-border accent-primary"
                      />
                    </th>
                    <th className="px-4 py-3">
                      Görev
                    </th>
                    <th className="px-4 py-3">
                      Proje
                    </th>
                    <th className="px-4 py-3">
                      Öncelik
                    </th>
                    <th className="px-4 py-3">
                      Durum
                    </th>
                    <th className="px-4 py-3">
                      Son tarih
                    </th>
                    {mode !==
                      "active" && (
                      <th className="px-4 py-3 text-right">
                        İşlem
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {tasks.map(
                    (task) => (
                      <tr
                        key={
                          task.id
                        }
                        onClick={() => {
                          if (
                            mode ===
                            "active"
                          ) {
                            setTaskDetailId(
                              task.id,
                            );
                          }
                        }}
                        className={`border-b border-border/60 last:border-0 transition ${
                          mode ===
                          "active"
                            ? "cursor-pointer hover:bg-muted/35"
                            : ""
                        }`}
                      >
                        <td className="px-4 py-3.5">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(
                              task.id,
                            )}
                            onClick={(
                              event,
                            ) =>
                              event.stopPropagation()
                            }
                            onChange={() =>
                              toggleTaskSelection(
                                task.id,
                              )
                            }
                            aria-label={`${task.title} görevini seç`}
                            className="size-4 rounded border-border accent-primary"
                          />
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            {mode === "active" && (
                              <button
                                type="button"
                                title={task.status === "DONE" ? "Görevi yeniden aç" : "Görevi tamamlandı olarak işaretle"}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  move.mutate({
                                    id: task.id,
                                    status: task.status === "DONE" ? "TODO" : "DONE",
                                  });
                                }}
                                className={`group/check relative grid size-4.5 shrink-0 place-items-center rounded-full border transition-all duration-200 ${
                                  task.status === "DONE"
                                    ? "border-emerald-500 bg-emerald-500 text-white shadow-xs"
                                    : "border-border/80 bg-background/50 hover:border-emerald-500 hover:bg-emerald-500/10"
                                }`}
                              >
                                {task.status === "DONE" ? (
                                  <Check className="size-2.5 stroke-[2.5]" />
                                ) : (
                                  <Check className="size-2.5 stroke-[2.5] text-emerald-500 opacity-0 transition-opacity group-hover/check:opacity-100" />
                                )}
                              </button>
                            )}
                            <p className={`max-w-[420px] truncate text-[13px] font-medium ${task.status === "DONE" ? "line-through text-muted-foreground" : ""}`}>
                              {task.title}
                            </p>
                          </div>

                          {task.taskTags.length >
                            0 && (
                            <div className="mt-1.5 flex gap-1.5">
                              {task.taskTags
                                .slice(
                                  0,
                                  3,
                                )
                                .map(
                                  ({
                                    tag,
                                  }) => (
                                    <span
                                      key={
                                        tag.id
                                      }
                                      className="text-[10px] text-muted-foreground"
                                    >
                                      #
                                      {
                                        tag.name
                                      }
                                    </span>
                                  ),
                                )}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          {task.project ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span
                                className="size-1.5 rounded-full"
                                style={{
                                  backgroundColor:
                                    task
                                      .project
                                      ?.color,
                                }}
                              />
                              {
                                task
                                  .project
                                  ?.name
                              }
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/60">
                              —
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span
                              className={`size-1.5 rounded-full ${priorityDot[task.priority]}`}
                            />
                            {
                              priorityLabel[
                                task
                                  .priority
                              ]
                            }
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          {mode ===
                          "active" ? (
                            <select
                              value={
                                task.status
                              }
                              onClick={(
                                event,
                              ) =>
                                event.stopPropagation()
                              }
                              onChange={(
                                event,
                              ) =>
                                move.mutate(
                                  {
                                    id: task.id,
                                    status:
                                      event
                                        .target
                                        .value as TaskStatus,
                                  },
                                )
                              }
                              className="h-8 rounded-lg border border-border/70 bg-background px-2 text-xs text-muted-foreground outline-none hover:text-foreground"
                            >
                              <option value="TODO">
                                Yapılacak
                              </option>
                              <option value="IN_PROGRESS">
                                Devam ediyor
                              </option>
                              <option value="DONE">
                                Tamamlandı
                              </option>
                            </select>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {
                                task.status
                              }
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-xs text-muted-foreground">
                          {formatDate(
                            task.dueDate,
                          )}
                        </td>

                        {mode ===
                          "archived" && (
                          <td className="px-4 py-3.5 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(
                                event,
                              ) => {
                                event.stopPropagation();
                                restoreArchive(
                                  task.id,
                                );
                              }}
                            >
                              <RotateCcw className="size-3" />
                              Geri al
                            </Button>
                          </td>
                        )}

                        {mode ===
                          "trash" && (
                          <td className="px-4 py-3.5">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  restoreTrash(
                                    task.id,
                                  )
                                }
                              >
                                <RotateCcw className="size-3" />
                                Geri yükle
                              </Button>

                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() =>
                                  permanentDelete(
                                    task.id,
                                  )
                                }
                              >
                                <Trash2 className="size-3" />
                                Kalıcı sil
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tasksQ.hasNextPage && (
          <div className="mt-5 flex justify-center">
            <Button
              variant="outline"
              disabled={
                tasksQ.isFetchingNextPage
              }
              onClick={() =>
                tasksQ.fetchNextPage()
              }
            >
              {tasksQ.isFetchingNextPage
                ? "Yükleniyor..."
                : "Daha fazla yükle"}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
