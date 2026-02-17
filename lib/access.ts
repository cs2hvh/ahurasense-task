export function canCreateWorkspaceWithRole(role?: string | null) {
  return role === "admin" || role === "manager";
}

export function canBypassProjectMembership(role?: string | null) {
  return role === "admin";
}
