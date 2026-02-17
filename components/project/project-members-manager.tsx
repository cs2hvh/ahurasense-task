"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

  const workspaceUserById = useMemo(
    () => new Map(workspaceUsers.map((user) => [user.userId, user])),
    [workspaceUsers],
  );

  const sortedMembers = useMemo(
    () =>
      [...members].sort((a, b) => {
        if (a.projectRole === "lead" && b.projectRole !== "lead") {
          return -1;
        }
        if (a.projectRole !== "lead" && b.projectRole === "lead") {
          return 1;
        }
        return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
      }),
    [members],
  );

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
    if (!canManage || !selectedUserId) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserId,
          role,
        }),
      });
      const payload = (await response.json()) as ApiResponse<ProjectMemberApi>;
      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "Failed to update project members");
      }

      const mapped = mapApiMember(payload.data);
      setMembers((prev) => {
        const index = prev.findIndex((member) => member.userId === mapped.userId);
        if (index === -1) {
          return [...prev, mapped];
        }

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
    if (!canManage) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const payload = (await response.json()) as ApiResponse<ProjectMemberApi>;
      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "Failed to update role");
      }

      const mapped = mapApiMember(payload.data);
      setMembers((prev) => prev.map((member) => (member.userId === userId ? mapped : member)));
      toast.success("Project member role updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update role");
    }
  }

  async function removeMember(userId: string) {
    if (!canManage) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/members/${userId}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as ApiResponse<{ success: boolean }>;
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to remove member");
      }

      setMembers((prev) => prev.filter((member) => member.userId !== userId));
      toast.success("Project member removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove member");
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Project Members</h2>
        <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
          Add workspace members to this project and manage their project roles.
        </p>

        <form className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_150px_auto]" onSubmit={addMember}>
          <select
            value={selectedUserId}
            onChange={(event) => setSelectedUserId(event.target.value)}
            disabled={!canManage || saving || workspaceUsers.length === 0}
            className="h-10 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 text-sm"
          >
            {workspaceUsers.length ? null : <option value="">No workspace members available</option>}
            {workspaceUsers.map((user) => (
              <option key={user.userId} value={user.userId}>
                {user.name} ({user.email})
              </option>
            ))}
          </select>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as (typeof projectRoles)[number]["value"])}
            disabled={!canManage || saving}
            className="h-10 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 text-sm"
          >
            {projectRoles.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Button type="submit" size="sm" disabled={!canManage || saving || !selectedUserId}>
            {saving ? "Saving..." : "Add/Update"}
          </Button>
        </form>

        {!canManage ? (
          <p className="mt-2 text-xs text-[var(--color-warning)]">You have read-only access for project membership settings.</p>
        ) : null}
      </Card>

      <Card className="p-0">
        <div className="grid grid-cols-[minmax(0,1fr)_130px_130px_110px_90px] border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3 text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
          <div>User</div>
          <div>Project Role</div>
          <div>Workspace Role</div>
          <div>Status</div>
          <div>Actions</div>
        </div>

        <div className="divide-y divide-[var(--color-border)]">
          {sortedMembers.map((member) => (
            <div
              key={member.userId}
              className="grid grid-cols-[minmax(0,1fr)_130px_130px_110px_90px] items-center px-4 py-3 text-sm"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <UserInline name={member.name} avatarUrl={member.avatarUrl} size="xs" textClassName="text-[var(--color-text-primary)]" />
                  {member.userId === currentUserId ? <span className="text-xs text-[var(--color-text-tertiary)]">(You)</span> : null}
                </div>
                <p className="truncate text-xs text-[var(--color-text-tertiary)]">{member.email}</p>
              </div>

              <div>
                <select
                  value={member.projectRole}
                  onChange={(event) =>
                    updateRole(member.userId, event.target.value as (typeof projectRoles)[number]["value"])
                  }
                  disabled={!canManage}
                  className="h-8 w-full border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 text-xs"
                >
                  {projectRoles.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-[var(--color-text-secondary)]">{member.workspaceRole}</div>
              <div className="text-[var(--color-text-secondary)]">{member.status}</div>
              <div>
                {canManage ? (
                  <button
                    onClick={() => removeMember(member.userId)}
                    className="text-xs text-[var(--color-error)] hover:underline"
                  >
                    Remove
                  </button>
                ) : (
                  <span className="text-xs text-[var(--color-text-tertiary)]">-</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {!members.length ? <Card className="p-6 text-sm text-[var(--color-text-secondary)]">No project members yet.</Card> : null}
    </div>
  );
}
