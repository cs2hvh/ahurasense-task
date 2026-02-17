import { z } from "zod";

export const createProjectSchema = z.object({
  key: z
    .string()
    .min(2)
    .max(10)
    .regex(/^[A-Z][A-Z0-9]*$/, "Key must be uppercase alphanumeric and start with a letter"),
  name: z.string().min(2).max(200),
  description: z.string().max(5000).optional(),
  type: z.enum(["software", "business", "service_desk"]),
  leadId: z.string().uuid().optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  type: z.enum(["software", "business", "service_desk"]).optional(),
  status: z.enum(["active", "archived", "on_hold"]).optional(),
  startDate: z.string().date().nullable().optional(),
  targetEndDate: z.string().date().nullable().optional(),
  leadId: z.string().uuid().nullable().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;


