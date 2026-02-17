"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { UserInline } from "@/components/ui/user-inline";

type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

interface WorkspaceMemberItem {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  workspaceRole: WorkspaceRole;
  systemRole: string;
  status: string;
  joinedAt: string;
}

interface WorkspaceMembersManagerProps {
  workspaceId: string;
  currentUserId: string;
  canManage: boolean;
  initialMembers: WorkspaceMemberItem[];
}

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

type AddMemberResponse = {
  member: WorkspaceMemberApi;
  generatedCredentials: { email: string; password: string } | null;
};

type WorkspaceMemberApi = {
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string | null;
    role: string;
    status: string;
  };
};

const manageableRoles = [
  { label: "Admin", value: "admin" },
  { label: "Member", value: "member" },
  { label: "Viewer", value: "viewer" },
] as const;

function mapApiMember(member: WorkspaceMemberApi): WorkspaceMemberItem {
  return {
    userId: member.user.id,
    name: `${member.user.firstName} ${member.user.lastName}`,
    email: member.user.email,
    avatarUrl: member.user.avatarUrl ?? null,
    workspaceRole: member.role,
    systemRole: member.user.role,
    status: member.user.status,
    joinedAt: member.joinedAt,
  };
}

export function WorkspaceMembersManager({
  workspaceId,
  currentUserId,
  canManage,
  initialMembers,
}: WorkspaceMembersManagerProps) {
  const [members, setMembers] = useState(initialMembers);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof manageableRoles)[number]["value"]>("member");
  const [createUserIfMissing, setCreateUserIfMissing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [generatedCredentials, setGeneratedCredentials] = useState<{ email: string; password: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const sortedMembers = useMemo(
    () =>
      [...members].sort((a, b) => {
        if (a.workspaceRole === "owner" && b.workspaceRole !== "owner") {
          return -1;
        }
        if (a.workspaceRole !== "owner" && b.workspaceRole === "owner") {
          return 1;
        }
        return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
      }),
    [members],
  );

  async function addMember(event: React.FormEvent) {
    event.preventDefault();
    if (!canManage) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          role,
          createUserIfMissing,
          ...(firstName.trim() ? { firstName: firstName.trim() } : {}),
          ...(lastName.trim() ? { lastName: lastName.trim() } : {}),
        }),
      });
      const payload = (await response.json()) as ApiResponse<AddMemberResponse>;
      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "Failed to add member");
      }

      const mapped = mapApiMember(payload.data.member);
      setMembers((prev) => {
        const index = prev.findIndex((member) => member.userId === mapped.userId);
        if (index === -1) {
          return [...prev, mapped];
        }

        const next = [...prev];
        next[index] = mapped;
        return next;
      });

      setEmail("");
      setRole("member");
      setFirstName("");
      setLastName("");
      setGeneratedCredentials(payload.data.generatedCredentials ?? null);
      toast.success(
        payload.data.generatedCredentials
          ? "Member account created and added"
          : "Workspace member updated",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add member");
    } finally {
      setSaving(false);
    }
  }

  async function copyCredential(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  }

  async function updateRole(userId: string, nextRole: (typeof manageableRoles)[number]["value"]) {
    if (!canManage) {
      return;
    }

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const payload = (await response.json()) as ApiResponse<WorkspaceMemberApi>;
      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "Failed to update member role");
      }

      const mapped = mapApiMember(payload.data);
      setMembers((prev) => prev.map((member) => (member.userId === userId ? mapped : member)));
      toast.success("Member role updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update member role");
    }
  }

  async function removeMember(userId: string) {
    if (!canManage) {
      return;
    }

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/members/${userId}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as ApiResponse<{ success: boolean }>;
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to remove member");
      }

      setMembers((prev) => prev.filter((member) => member.userId !== userId));
      toast.success("Member removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove member");
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Members</h2>
        <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
          Add workspace users by email and manage access roles.
        </p>

        <form className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_150px_auto]" onSubmit={addMember}>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@company.com"
            disabled={!canManage || saving}
          />
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as (typeof manageableRoles)[number]["value"])}
            disabled={!canManage || saving}
            className="h-10 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 text-sm"
          >
            {manageableRoles.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Button type="submit" size="sm" disabled={!canManage || saving || !email.trim()}>
            {saving ? "Adding..." : "Add Member"}
          </Button>

          <label className="inline-flex items-center gap-2 text-xs text-[var(--color-text-secondary)] md:col-span-3">
            <input
              type="checkbox"
              checked={createUserIfMissing}
              onChange={(event) => setCreateUserIfMissing(event.target.checked)}
              disabled={!canManage || saving}
              className="h-4 w-4 accent-[var(--color-accent-primary)]"
            />
            Create account if email does not exist (auto-generate password)
          </label>

          {createUserIfMissing ? (
            <>
              <Input
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="First name (optional)"
                disabled={!canManage || saving}
                className="md:col-span-1"
              />
              <Input
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                placeholder="Last name (optional)"
                disabled={!canManage || saving}
                className="md:col-span-2"
              />
            </>
          ) : null}
        </form>

        {!canManage ? (
          <p className="mt-2 text-xs text-[var(--color-warning)]">You have read-only access for workspace membership settings.</p>
        ) : null}

        {generatedCredentials ? (
          <div className="mt-3 border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3 text-xs">
            <p className="text-[var(--color-text-secondary)]">New member credentials (share once):</p>
            <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <p className="truncate text-[var(--color-text-primary)]">Email: {generatedCredentials.email}</p>
              <Button type="button" size="sm" variant="secondary" onClick={() => void copyCredential(generatedCredentials.email, "Email")}>
                Copy Email
              </Button>
              <p className="truncate text-[var(--color-text-primary)]">Password: {generatedCredentials.password}</p>
              <Button type="button" size="sm" variant="secondary" onClick={() => void copyCredential(generatedCredentials.password, "Password")}>
                Copy Password
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      <Card className="p-0">
        <div className="grid grid-cols-[minmax(0,1fr)_150px_120px_110px_90px] border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3 text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
          <div>User</div>
          <div>Workspace Role</div>
          <div>System Role</div>
          <div>Status</div>
          <div>Actions</div>
        </div>

        <div className="divide-y divide-[var(--color-border)]">
          {sortedMembers.map((member) => {
            const isOwner = member.workspaceRole === "owner";
            const isCurrentUser = member.userId === currentUserId;
            return (
              <div
                key={member.userId}
                className="grid grid-cols-[minmax(0,1fr)_150px_120px_110px_90px] items-center px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <UserInline name={member.name} avatarUrl={member.avatarUrl} size="xs" textClassName="text-[var(--color-text-primary)]" />
                    {isCurrentUser ? <span className="text-xs text-[var(--color-text-tertiary)]">(You)</span> : null}
                  </div>
                  <p className="truncate text-xs text-[var(--color-text-tertiary)]">{member.email}</p>
                </div>

                <div>
                  {isOwner ? (
                    <span className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Owner</span>
                  ) : (
                    <select
                      value={member.workspaceRole}
                      onChange={(event) =>
                        updateRole(
                          member.userId,
                          event.target.value as (typeof manageableRoles)[number]["value"],
                        )
                      }
                      disabled={!canManage}
                      className="h-8 w-full border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 text-xs"
                    >
                      {manageableRoles.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="text-[var(--color-text-secondary)]">{member.systemRole}</div>
                <div className="text-[var(--color-text-secondary)]">{member.status}</div>

                <div>
                  {!isOwner && canManage ? (
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
            );
          })}
        </div>
      </Card>

      {!members.length ? <Card className="p-6 text-sm text-[var(--color-text-secondary)]">No members in workspace yet.</Card> : null}
    </div>
  );
}
