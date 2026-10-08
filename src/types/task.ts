export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type TaskPriority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
export type TaskApprovalStatus =
  | "NOT_REQUIRED"
  | "PENDING"
  | "APPROVED"
  | "REVISION_REQUESTED";
export type RecurrenceFrequency = "NONE" | "DAILY" | "WEEKLY" | "MONTHLY";

export type TagDTO = { id: string; name: string; color: string };
export type UserSummaryDTO = {
  id: string;
  name: string | null;
  email: string;
  avatarUrl?: string | null;
};
export type ProjectDTO = {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  completionEmailTo?: string | null;
  _count?: { tasks: number };
};
export type SubtaskDTO = { id: string; title: string; isCompleted: boolean; position: number };
export type CommentDTO = { id: string; body: string; createdAt: string };
export type AttachmentDTO = {
  id: string;
  name: string;
  url: string;
  mimeType: string | null;
  size: number | null;
  createdAt: string;
};
export type MailDeliveryDTO = {
  id: string;
  recipients: string;
  subject: string;
  status: "SKIPPED" | "SENT" | "FAILED";
  error: string | null;
  createdAt: string;
};

export type TaskDTO = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignedToId: string | null;
  assignedTo: UserSummaryDTO | null;
  approvalStatus: TaskApprovalStatus;
  approvalNote: string | null;
  approvedBy: { id: string; name: string | null; email: string } | null;
  approvedAt: string | null;
  recurrenceFrequency: RecurrenceFrequency;
  recurrenceInterval: number;
  recurrenceSourceTaskId: string | null;
  dueDate: string | null;
  completedAt: string | null;
  archivedAt: string | null;
  deletedAt: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  project: { id: string; name: string; color: string; completionEmailTo?: string | null } | null;
  taskTags: { tag: TagDTO }[];
  subtasks: SubtaskDTO[];
  comments: CommentDTO[];
  attachments: AttachmentDTO[];
  mailDeliveries: MailDeliveryDTO[];
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
