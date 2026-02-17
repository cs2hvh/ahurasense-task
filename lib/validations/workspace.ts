import { z } from "zod";

export const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(200),
  slug: z
    .string()
    .min(2)
    .max(200)
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers and hyphens"),
  description: z.string().max(5000).optional(),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;


