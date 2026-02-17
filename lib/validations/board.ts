import { z } from "zod";

export const createBoardStatusSchema = z.object({
  name: z.string().min(2).max(50),
  category: z.enum(["todo", "in_progress", "done"]),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export const reorderBoardStatusesSchema = z.object({
  statuses: z
    .array(
      z.object({
        id: z.string().uuid(),
        position: z.number().int().min(0),
        name: z.string().min(2).max(50).optional(),
        category: z.enum(["todo", "in_progress", "done"]).optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
      }),
    )
    .min(1),
});

export type CreateBoardStatusInput = z.infer<typeof createBoardStatusSchema>;
export type ReorderBoardStatusesInput = z.infer<typeof reorderBoardStatusesSchema>;


