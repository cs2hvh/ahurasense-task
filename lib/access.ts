export function canCreateWorkspaceWithRole(role?: string | null) {
  return role === "admin" || role === "manager";
}

export function canBypassProjectMembership(globalRole?: string | null, workspaceRole?: string | null) {
  return globalRole === "admin" || workspaceRole === "owner" || workspaceRole === "admin";
}
