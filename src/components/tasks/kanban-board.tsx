/* eslint-disable react-hooks/refs */
"use client";

import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  Circle,
  CircleCheck,
  CircleDashed,
  GripVertical,
} from "lucide-react";

import { TaskCard } from "@/components/tasks/task-card";
import type {
  TaskDTO,
  TaskStatus,
} from "@/types/task";

const columns: [
  TaskStatus,
  string,
  typeof Circle,
][] = [
  [
    "TODO",
    "Yapılacak",
    Circle,
  ],
  [
    "IN_PROGRESS",
    "Devam ediyor",
    CircleDashed,
  ],
  [
    "DONE",
    "Tamamlandı",
    CircleCheck,
  ],
];

type ReorderItem = {
  id: string;
  status: TaskStatus;
  position: number;
};

function DraggableTask({
  task,
}: {
  task: TaskDTO;
}) {
  const drag =
    useDraggable({
      id: `task:${task.id}`,
      data: {
        type: "task",
        task,
      },
    });

  const drop =
    useDroppable({
      id: `target:${task.id}`,
      data: {
        type: "task",
        taskId: task.id,
        status: task.status,
      },
    });

  const setNodeRef = (
    node: HTMLElement | null,
  ) => {
    drag.setNodeRef(node);
    drop.setNodeRef(node);
  };

  const style =
    drag.transform
      ? {
          transform: `translate3d(${drag.transform.x}px, ${drag.transform.y}px, 0)`,
          zIndex: 50,
          position:
            "relative" as const,
        }
      : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={
        drag.isDragging
          ? "opacity-45"
          : drop.isOver
            ? "rounded-xl ring-2 ring-foreground/10"
            : ""
      }
    >
      <TaskCard
        task={task}
        dragHandle={
          <button
            type="button"
            aria-label="Görevi taşı"
            {...drag.listeners}
            {...drag.attributes}
            onClick={(event) =>
              event.stopPropagation()
            }
            className="cursor-grab text-muted-foreground/45 transition hover:text-foreground active:cursor-grabbing"
          >
            <GripVertical className="size-3.5" />
          </button>
        }
      />
    </div>
  );
}

function Column({
  status,
  label,
  Icon,
  tasks,
}: {
  status: TaskStatus;
  label: string;
  Icon: typeof Circle;
  tasks: TaskDTO[];
}) {
  const drop = useDroppable({
    id: `column:${status}`,
    data: {
      type: "column",
      status,
    },
  });

  const columnConfig = {
    TODO: { color: "bg-blue-500", badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
    IN_PROGRESS: { color: "bg-amber-500", badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
    DONE: { color: "bg-emerald-500", badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  }[status] ?? { color: "bg-zinc-400", badge: "bg-muted text-muted-foreground" };

  return (
    <section
      ref={drop.setNodeRef}
      className={`min-h-[550px] rounded-2xl border border-border/70 p-3 transition-colors ${
        drop.isOver
          ? "bg-primary/[0.04] ring-2 ring-primary/30"
          : "bg-muted/30"
      }`}
    >
      <div className="mb-3 flex h-10 items-center justify-between rounded-xl px-2">
        <div className="flex items-center gap-2">
          <Icon className="size-3.5 text-muted-foreground" />
          <span className={`size-1.5 rounded-full ${columnConfig.color}`} />
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {label}
          </h2>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${columnConfig.badge}`}>
          {tasks.length}
        </span>
      </div>

      <div className="space-y-2.5 min-h-[460px]">
        {tasks.map((task) => (
          <DraggableTask
            key={task.id}
            task={task}
          />
        ))}
        {tasks.length === 0 && (
          <div className="grid h-36 place-items-center rounded-xl border border-dashed border-border/70 text-center text-xs text-muted-foreground/70">
            Bu aşamada görev yok
          </div>
        )}
      </div>
    </section>
  );
}

export function KanbanBoard({
  tasks,
  onReorder,
}: {
  tasks: TaskDTO[];
  onReorder: (
    items: ReorderItem[],
  ) => void;
}) {
  const sensors =
    useSensors(
      useSensor(
        PointerSensor,
        {
          activationConstraint: {
            distance: 6,
          },
        },
      ),
    );

  function handleDragEnd(
    event: DragEndEvent,
  ) {
    const activeTask =
      event.active.data.current
        ?.task as
        | TaskDTO
        | undefined;

    const over = event.over;

    if (
      !activeTask ||
      !over
    ) {
      return;
    }

    const overType =
      over.data.current
        ?.type as
        | "task"
        | "column"
        | undefined;

    let targetStatus: TaskStatus;
    let targetTaskId:
      | string
      | null = null;

    if (
      overType === "column"
    ) {
      targetStatus =
        over.data.current
          ?.status as TaskStatus;
    } else if (
      overType === "task"
    ) {
      targetStatus =
        over.data.current
          ?.status as TaskStatus;

      targetTaskId =
        over.data.current
          ?.taskId as string;
    } else {
      return;
    }

    const grouped =
      Object.fromEntries(
        columns.map(
          ([status]) => [
            status,
            tasks
              .filter(
                (task) =>
                  task.status ===
                  status,
              )
              .sort(
                (a, b) =>
                  a.position -
                  b.position,
              ),
          ],
        ),
      ) as Record<
        TaskStatus,
        TaskDTO[]
      >;

    for (const status of Object.keys(
      grouped,
    ) as TaskStatus[]) {
      grouped[status] =
        grouped[status].filter(
          (task) =>
            task.id !==
            activeTask.id,
        );
    }

    const targetColumn =
      grouped[targetStatus];

    let targetIndex =
      targetColumn.length;

    if (targetTaskId) {
      const index =
        targetColumn.findIndex(
          (task) =>
            task.id ===
            targetTaskId,
        );

      if (index >= 0) {
        targetIndex = index;
      }
    }

    targetColumn.splice(
      targetIndex,
      0,
      {
        ...activeTask,
        status: targetStatus,
      },
    );

    const items: ReorderItem[] =
      [];

    for (const [
      status,
    ] of columns) {
      grouped[
        status
      ].forEach(
        (
          task,
          index,
        ) => {
          items.push({
            id: task.id,
            status,
            position:
              (index + 1) *
              1000,
          });
        },
      );
    }

    onReorder(items);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragEnd={
        handleDragEnd
      }
    >
      <div className="grid min-w-[900px] grid-cols-3 gap-3">
        {columns.map(
          ([
            status,
            label,
            Icon,
          ]) => (
            <Column
              key={status}
              status={status}
              label={label}
              Icon={Icon}
              tasks={tasks
                .filter(
                  (task) =>
                    task.status ===
                    status,
                )
                .sort(
                  (a, b) =>
                    a.position -
                    b.position,
                )}
            />
          ),
        )}
      </div>
    </DndContext>
  );
}
