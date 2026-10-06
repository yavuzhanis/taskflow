export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type TaskPriority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";

export type TagDTO = { id: string; name: string; color: string };
export type ProjectDTO = { id: string; name: string; description?: string | null; color: string; _count?: { tasks: number } };
export type SubtaskDTO = { id: string; title: string; isCompleted: boolean; position: number };
export type CommentDTO = { id: string; body: string; createdAt: string };

export type TaskDTO = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  completedAt: string | null;
  archivedAt: string | null;
  deletedAt: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  project: { id: string; name: string; color: string } | null;
  taskTags: { tag: TagDTO }[];
  subtasks: SubtaskDTO[];
  comments: CommentDTO[];
};

export type TasksResponse = {
  tasks: TaskDTO[];
  pagination?: {
    nextCursor?: string | null;
    hasMore?: boolean;
    total?: number;
  };
};

export type ActivityLogDTO = {
  id: string;
  userId: string;
  taskId: string | null;
  action: string;
  details: string | null;
  createdAt: string;
  task?: {
    id: string;
    title: string;
    status?: TaskStatus;
    priority?: TaskPriority;
  } | null;
};

export type WeeklyTrendDay = {
  date: string;
  dayLabel: string;
  completed: number;
  created: number;
};

