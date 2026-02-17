import { z } from "zod";

export const createIssueSchema = z.object({
  type: z.enum(["story", "task", "bug", "epic", "subtask"]),
  title: z.string().min(3).max(300),
  description: z.string().max(20000).optional(),
  statusId: z.string().uuid(),
  priority: z.enum(["lowest", "low", "medium", "high", "highest"]).default("medium"),
  assigneeId: z.string().uuid().optional(),
  sprintId: z.string().uuid().optional(),
  storyPoints: z.number().int().min(0).max(100).optional(),
  dueDate: z.string().date().optional(),
  parentId: z.string().uuid().optional(),
  epicId: z.string().uuid().optional(),
});

export const moveIssueSchema = z.object({
  statusId: z.string().uuid().optional(),
  sprintId: z.string().uuid().nullable().optional(),
  position: z.number().int().min(0),
});

export const updateIssueSchema = z.object({
  title: z.string().min(3).max(300).optional(),
  description: z.string().max(20000).optional().nullable(),
  type: z.enum(["story", "task", "bug", "epic", "subtask"]).optional(),
  statusId: z.string().uuid().optional(),
  priority: z.enum(["lowest", "low", "medium", "high", "highest"]).optional(),
  assigneeId: z.string().uuid().optional().nullable(),
  sprintId: z.string().uuid().optional().nullable(),
  storyPoints: z.number().int().min(0).max(100).optional().nullable(),
  dueDate: z.string().date().optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
  epicId: z.string().uuid().optional().nullable(),
});

export type CreateIssueInput = z.infer<typeof createIssueSchema>;
export type MoveIssueInput = z.infer<typeof moveIssueSchema>;
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;


