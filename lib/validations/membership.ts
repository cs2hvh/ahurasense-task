import { z } from "zod";

export const workspaceMemberRoleSchema = z.enum(["admin", "member", "viewer"]);
export const projectMemberRoleSchema = z.enum(["lead", "developer", "tester", "viewer"]);

export const addWorkspaceMemberSchema = z.object({
  email: z.string().email(),
  role: workspaceMemberRoleSchema.default("member"),
  createUserIfMissing: z.boolean().optional().default(false),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
});

export const updateWorkspaceMemberSchema = z.object({
  role: workspaceMemberRoleSchema,
});

export const addProjectMemberSchema = z.object({
  userId: z.string().uuid(),
  role: projectMemberRoleSchema.default("developer"),
});

export const updateProjectMemberSchema = z.object({
  role: projectMemberRoleSchema,
});

export type AddWorkspaceMemberInput = z.infer<typeof addWorkspaceMemberSchema>;
export type UpdateWorkspaceMemberInput = z.infer<typeof updateWorkspaceMemberSchema>;
export type AddProjectMemberInput = z.infer<typeof addProjectMemberSchema>;
export type UpdateProjectMemberInput = z.infer<typeof updateProjectMemberSchema>;
