import { z } from "zod";

export const taskStatus = z.enum(["TODO", "IN_PROGRESS", "DONE"]);
export const taskPriority = z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]);
export const taskApprovalStatus = z.enum([
  "NOT_REQUIRED",
  "PENDING",
  "APPROVED",
  "REVISION_REQUESTED",
]);
export const recurrenceFrequency = z.enum(["NONE", "DAILY", "WEEKLY", "MONTHLY"]);

export const taskCreateSchema = z.object({
  title: z.string().trim().min(1).max(240),
  description: z.string().max(20000).optional().nullable(),
  status: taskStatus.optional(),
  priority: taskPriority.optional(),
  assignedToId: z.string().optional().nullable(),
  approvalStatus: taskApprovalStatus.optional(),
  approvalNote: z.string().max(5000).optional().nullable(),
  recurrenceFrequency: recurrenceFrequency.optional(),
  recurrenceInterval: z.number().int().min(1).max(24).optional(),
  projectId: z.cuid().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  tagIds: z.array(z.cuid()).max(30).optional(),
});

export const taskUpdateSchema = taskCreateSchema.partial().extend({
  archived: z.boolean().optional(),
  restore: z.boolean().optional(),
  position: z.number().finite().optional(),
});

export const attachmentSchema = z.object({
  name: z.string().trim().min(1).max(240),
  url: z.url(),
  mimeType: z.string().max(120).optional().nullable(),
  size: z.number().int().min(0).max(100_000_000).optional().nullable(),
});

const emailListSchema = z
  .string()
  .max(2000)
  .optional()
  .nullable()
  .refine((value) => {
    if (!value?.trim()) return true;
    return value
      .split(",")
      .map((email) => email.trim())
      .every((email) => z.email().safeParse(email).success);
  }, "E-posta adreslerini virgülle ayrılmış geçerli adresler olarak girin");

export const projectSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().max(2000).optional().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  completionEmailTo: emailListSchema,
});

export const tagSchema = z.object({
  name: z.string().trim().min(1).max(60),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const subtaskSchema = z.object({
  title: z.string().trim().min(1).max(240),
});

export const commentSchema = z.object({
  body: z.string().trim().min(1).max(5000),
});

export const preferenceSchema = z.object({
  theme: z.enum(["SYSTEM", "LIGHT", "DARK"]).optional(),
  defaultView: z.enum(["LIST", "KANBAN"]).optional(),
  autoArchiveCompleted: z.boolean().optional(),
  autoArchiveDays: z.number().int().min(1).max(365).optional(),
});
