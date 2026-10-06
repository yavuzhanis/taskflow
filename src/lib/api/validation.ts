import { z } from "zod";

export const taskStatus = z.enum(["TODO", "IN_PROGRESS", "DONE"]);
export const taskPriority = z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]);

export const taskCreateSchema = z.object({
  title: z.string().trim().min(1).max(240),
  description: z.string().max(20000).optional().nullable(),
  status: taskStatus.optional(),
  priority: taskPriority.optional(),
  projectId: z.cuid().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  tagIds: z.array(z.cuid()).max(30).optional(),
});

export const taskUpdateSchema = taskCreateSchema.partial().extend({
  archived: z.boolean().optional(),
  restore: z.boolean().optional(),
  position: z.number().finite().optional(),
});

export const projectSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().max(2000).optional().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
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
