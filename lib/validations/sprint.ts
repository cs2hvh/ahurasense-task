import { z } from "zod";

export const createSprintSchema = z
  .object({
    name: z.string().min(2).max(200),
    goal: z.string().max(5000).optional(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
  })
  .refine((value) => new Date(value.endDate).getTime() > new Date(value.startDate).getTime(), {
    message: "endDate must be after startDate",
    path: ["endDate"],
  });

export const updateSprintSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  goal: z.string().max(5000).optional().nullable(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: z.enum(["planning", "active", "completed"]).optional(),
});

export const completeSprintSchema = z.object({
  nextSprintId: z.string().uuid().optional().nullable(),
});


