"use client";

import { ChevronDown, Eye, Search, Trash2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserInline } from "@/components/ui/user-inline";

type ProjectRole = "lead" | "developer" | "tester" | "viewer";

interface ProjectMemberItem {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  projectRole: ProjectRole;
  workspaceRole: "owner" | "admin" | "member" | "viewer";
  status: string;
  joinedAt: string;
}

interface WorkspaceUserOption {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  workspaceRole: "owner" | "admin" | "member" | "viewer";
  status: string;
}

interface ProjectMembersManagerProps {
  projectId: string;
  currentUserId: string;
  canManage: boolean;
  initialMembers: ProjectMemberItem[];
  workspaceUsers: WorkspaceUserOption[];
}

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

type ProjectMemberApi = {
  userId: string;
  role: ProjectRole;
  joinedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string | null;
    status: string;
  };
};

const projectRoles = [
  { label: "Lead", value: "lead" },
  { label: "Developer", value: "developer" },
  { label: "Tester", value: "tester" },
  { label: "Viewer", value: "viewer" },
] as const;

const ROLE_CONFIG: Record<ProjectRole, { label: string; color: string; bg: string }> = {
  lead: { label: "Lead", color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20" },
  developer: { label: "Developer", color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20" },
  tester: { label: "Tester", color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/20" },
  viewer: { label: "Viewer", color: "text-gray-400", bg: "bg-gray-400/10 border-gray-400/20" },
};

function RoleBadge({ role }: { role: ProjectRole }) {
  const cfg = ROLE_CONFIG[role];
  return (
    <span className={`inline-flex items-center border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

export function ProjectMembersManager({
  projectId,
  currentUserId,
  canManage,
  initialMembers,
  workspaceUsers,
}: ProjectMembersManagerProps) {
  const [members, setMembers] = useState(initialMembers);
  const [selectedUserId, setSelectedUserId] = useState(workspaceUsers[0]?.userId ?? "");
  const [role, setRole] = useState<(typeof projectRoles)[number]["value"]>("developer");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const router = useRouter();

  const workspaceUserById = useMemo(
    () => new Map(workspaceUsers.map((user) => [user.userId, user])),
    [workspaceUsers],
  );

  const sortedMembers = useMemo(() => {
    const roleOrder: Record<ProjectRole, number> = { lead: 0, developer: 1, tester: 2, viewer: 3 };
    return [...members]
      .filter((m) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const ra = roleOrder[a.projectRole] ?? 4;
        const rb = roleOrder[b.projectRole] ?? 4;
        if (ra !== rb) return ra - rb;
        return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
      });
  }, [members, search]);

  function mapApiMember(member: ProjectMemberApi): ProjectMemberItem {
    const workspaceUser = workspaceUserById.get(member.user.id);
    return {
      userId: member.user.id,
      name: `${member.user.firstName} ${member.user.lastName}`,
      email: member.user.email,
      avatarUrl: member.user.avatarUrl ?? null,
      projectRole: member.role,
      workspaceRole: workspaceUser?.workspaceRole ?? "member",
      status: member.user.status,
      joinedAt: member.joinedAt,
    };
  }

  async function addMember(event: React.FormEvent) {
    event.preventDefault();
    if (!canManage || !selectedUserId) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId, role }),
      });
      const payload = (await response.json()) as ApiResponse<ProjectMemberApi>;
      if (!response.ok || !payload.data) throw new Error(payload.error ?? "Failed to update project members");

      const mapped = mapApiMember(payload.data);
      setMembers((prev) => {
        const index = prev.findIndex((m) => m.userId === mapped.userId);
        if (index === -1) return [...prev, mapped];
        const next = [...prev];
        next[index] = mapped;
        return next;
      });
      toast.success("Project member updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update project members");
    } finally {
      setSaving(false);
    }
  }

  async function updateRole(userId: string, nextRole: (typeof projectRoles)[number]["value"]) {
    if (!canManage) return;
    try {
      const response = await fetch(`/api/projects/${projectId}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const payload = (await response.json()) as ApiResponse<ProjectMemberApi>;
      if (!response.ok || !payload.data) throw new Error(payload.error ?? "Failed to update role");

      const mapped = mapApiMember(payload.data);
      setMembers((prev) => prev.map((m) => (m.userId === userId ? mapped : m)));
      toast.success("Role updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update role");
    }
  }

  async function removeMember(userId: string) {
    if (!canManage) return;
    try {
      const response = await fetch(`/api/projects/${projectId}/members/${userId}`, { method: "DELETE" });
      const payload = (await response.json()) as ApiResponse<{ success: boolean }>;
      if (!response.ok) throw new Error(payload.error ?? "Failed to remove member");
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
      toast.success("Member removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove member");
    }
  }

  return (
    <div className="space-y-4">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members..."
            className="pl-9"
          />
        </div>
        <span className="text-xs text-[var(--color-text-tertiary)]">
          {members.length} member{members.length !== 1 ? "s" : ""}
        </span>
        {canManage && (
          <Button
            size="sm"
            className="ml-auto gap-1.5"
            onClick={() => setShowInvite(!showInvite)}
          >
            <UserPlus className="size-3.5" />
            {showInvite ? "Cancel" : "Add Member"}
          </Button>
        )}
      </div>

      {/* ── Add Member Panel ── */}
      {showInvite && canManage && (
        <div className="border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Add Project Member</h3>
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">Select a workspace member to add to this project.</p>
          <form className="mt-3 space-y-3" onSubmit={addMember}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_160px]">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                disabled={saving || workspaceUsers.length === 0}
                className="h-10 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 text-sm text-[var(--color-text-primary)]"
              >
                {workspaceUsers.length === 0 && <option value="">No workspace members</option>}
                {workspaceUsers.map((u) => (
                  <option key={u.userId} value={u.userId}>{u.name} ({u.email})</option>
                ))}
              </select>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as (typeof projectRoles)[number]["value"])}
                disabled={saving}
                className="h-10 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 text-sm text-[var(--color-text-primary)]"
              >
                {projectRoles.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <Button type="submit" size="sm" disabled={saving || !selectedUserId}>
              {saving ? "Adding..." : "Add to Project"}
            </Button>
          </form>
        </div>
      )}

      {/* ── Members Table ── */}
      <div className="overflow-hidden border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-primary)]">
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">Member</th>
              <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] md:table-cell">Project Role</th>
              <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] lg:table-cell">Workspace Role</th>
              <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] lg:table-cell">Joined</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {sortedMembers.map((member) => {
              const isCurrentUser = member.userId === currentUserId;

              return (
                <tr key={member.userId} className="transition-colors hover:bg-[var(--color-bg-primary)]/50">
                  <td className="px-4 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <UserInline name={member.name} avatarUrl={member.avatarUrl} userId={member.userId} size="xs" textClassName="font-medium text-[var(--color-text-primary)]" />
                        {isCurrentUser && <span className="text-[10px] text-[var(--color-text-tertiary)]">(you)</span>}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-[var(--color-text-tertiary)]">{member.email}</p>
                      <div className="mt-1 md:hidden"><RoleBadge role={member.projectRole} /></div>
                    </div>
                  </td>

                  <td className="hidden px-4 py-3 md:table-cell">
                    {canManage ? (
                      <div className="relative inline-flex items-center">
                        <select
                          value={member.projectRole}
                          onChange={(e) => updateRole(member.userId, e.target.value as (typeof projectRoles)[number]["value"])}
                          className="appearance-none border border-[var(--color-border)] bg-[var(--color-bg-primary)] py-1 pl-2 pr-6 text-xs text-[var(--color-text-primary)]"
                        >
                          {projectRoles.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-1.5 size-3 text-[var(--color-text-tertiary)]" />
                      </div>
                    ) : (
                      <RoleBadge role={member.projectRole} />
                    )}
                  </td>

                  <td className="hidden px-4 py-3 text-xs capitalize text-[var(--color-text-secondary)] lg:table-cell">
                    {member.workspaceRole}
                  </td>

                  <td className="hidden px-4 py-3 text-xs text-[var(--color-text-tertiary)] lg:table-cell">
                    {new Date(member.joinedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => router.push(`/profile/${member.userId}`)}
                        title="View profile"
                        className="inline-flex size-7 items-center justify-center text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
                      >
                        <Eye className="size-3.5" />
                      </button>
                      {canManage && (
                        <button
                          onClick={() => removeMember(member.userId)}
                          title="Remove member"
                          className="inline-flex size-7 items-center justify-center text-[var(--color-text-tertiary)] transition-colors hover:bg-red-500/10 hover:text-[var(--color-error)]"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {sortedMembers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-[var(--color-text-tertiary)]">
                  {search.trim() ? "No members match your search." : "No project members yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
