"use client";

import { ChevronDown, Copy, Search, Shield, ShieldCheck, Trash2, UserPlus, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
  canAssignAdmin: boolean;
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

const ROLE_CONFIG: Record<WorkspaceRole, { label: string; color: string; bg: string }> = {
  owner: { label: "Owner", color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20" },
  admin: { label: "Admin", color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20" },
  member: { label: "Member", color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
  viewer: { label: "Viewer", color: "text-gray-400", bg: "bg-gray-400/10 border-gray-400/20" },
};

const STATUS_CONFIG: Record<string, { dot: string }> = {
  active: { dot: "bg-emerald-400" },
  inactive: { dot: "bg-gray-500" },
  suspended: { dot: "bg-red-400" },
};

function RoleBadge({ role }: { role: WorkspaceRole }) {
  const cfg = ROLE_CONFIG[role];
  return (
    <span className={`inline-flex items-center gap-1 border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${cfg.bg} ${cfg.color}`}>
      {role === "owner" ? <ShieldCheck className="size-3" /> : role === "admin" ? <Shield className="size-3" /> : null}
      {cfg.label}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.inactive;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
      <span className={`size-1.5 rounded-full ${cfg.dot}`} />
      <span className="capitalize">{status}</span>
    </span>
  );
}

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
  canAssignAdmin,
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
  const [search, setSearch] = useState("");
  const [showInvite, setShowInvite] = useState(false);

  const assignableRoles = useMemo(
    () => (canAssignAdmin ? manageableRoles : manageableRoles.filter((option) => option.value !== "admin")),
    [canAssignAdmin],
  );

  const router = useRouter();

  const sortedMembers = useMemo(() => {
    const roleOrder: Record<WorkspaceRole, number> = { owner: 0, admin: 1, member: 2, viewer: 3 };
    return [...members]
      .filter((m) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const ra = roleOrder[a.workspaceRole] ?? 4;
        const rb = roleOrder[b.workspaceRole] ?? 4;
        if (ra !== rb) return ra - rb;
        return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
      });
  }, [members, search]);

  async function addMember(event: React.FormEvent) {
    event.preventDefault();
    if (!canManage) return;

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
      if (!response.ok || !payload.data) throw new Error(payload.error ?? "Failed to add member");

      const mapped = mapApiMember(payload.data.member);
      setMembers((prev) => {
        const index = prev.findIndex((m) => m.userId === mapped.userId);
        if (index === -1) return [...prev, mapped];
        const next = [...prev];
        next[index] = mapped;
        return next;
      });

      setEmail("");
      setRole("member");
      setFirstName("");
      setLastName("");
      setGeneratedCredentials(payload.data.generatedCredentials ?? null);
      toast.success(payload.data.generatedCredentials ? "Account created & member added" : "Member updated");
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
    if (!canManage) return;
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const payload = (await response.json()) as ApiResponse<WorkspaceMemberApi>;
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
      const response = await fetch(`/api/workspaces/${workspaceId}/members/${userId}`, { method: "DELETE" });
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

      {/* ── Invite Panel ── */}
      {showInvite && canManage && (
        <div className="border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Add Member</h3>
          <form className="mt-3 space-y-3" onSubmit={addMember}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_160px]">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                disabled={saving}
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as (typeof manageableRoles)[number]["value"])}
                disabled={saving}
                className="h-10 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 text-sm text-[var(--color-text-primary)]"
              >
                {assignableRoles.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <label className="inline-flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
              <input
                type="checkbox"
                checked={createUserIfMissing}
                onChange={(e) => setCreateUserIfMissing(e.target.checked)}
                disabled={saving}
                className="h-3.5 w-3.5 accent-[var(--color-accent-primary)]"
              />
              Create new account if user doesn&apos;t exist
            </label>

            {createUserIfMissing && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" disabled={saving} />
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" disabled={saving} />
              </div>
            )}

            <Button type="submit" size="sm" disabled={saving || !email.trim()}>
              {saving ? "Adding..." : "Add to Workspace"}
            </Button>
          </form>

          {generatedCredentials && (
            <div className="mt-4 border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-xs font-medium text-emerald-400">Account created — share these credentials securely:</p>
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate bg-[var(--color-bg-primary)] px-2 py-1 text-xs text-[var(--color-text-primary)]">{generatedCredentials.email}</code>
                  <button onClick={() => void copyCredential(generatedCredentials.email, "Email")} className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"><Copy className="size-3.5" /></button>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate bg-[var(--color-bg-primary)] px-2 py-1 text-xs text-[var(--color-text-primary)]">{generatedCredentials.password}</code>
                  <button onClick={() => void copyCredential(generatedCredentials.password, "Password")} className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"><Copy className="size-3.5" /></button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Members Table ── */}
      <div className="overflow-hidden border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-primary)]">
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">Member</th>
              <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] md:table-cell">Role</th>
              <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] lg:table-cell">Status</th>
              <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] lg:table-cell">Joined</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {sortedMembers.map((member) => {
              const isOwner = member.workspaceRole === "owner";
              const isCurrentUser = member.userId === currentUserId;
              const isAdminMember = member.workspaceRole === "admin";
              const canEditRole = canManage && !isOwner && (canAssignAdmin || !isAdminMember);
              const canRemove = canManage && !isOwner && !isCurrentUser && (canAssignAdmin || !isAdminMember);

              return (
                <tr key={member.userId} className="transition-colors hover:bg-[var(--color-bg-primary)]/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <UserInline name={member.name} avatarUrl={member.avatarUrl} userId={member.userId} size="xs" textClassName="font-medium text-[var(--color-text-primary)]" />
                          {isCurrentUser && <span className="text-[10px] text-[var(--color-text-tertiary)]">(you)</span>}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-[var(--color-text-tertiary)]">{member.email}</p>
                        {/* Mobile-only role badge */}
                        <div className="mt-1 md:hidden"><RoleBadge role={member.workspaceRole} /></div>
                      </div>
                    </div>
                  </td>

                  <td className="hidden px-4 py-3 md:table-cell">
                    {canEditRole ? (
                      <div className="relative inline-flex items-center">
                        <select
                          value={member.workspaceRole}
                          onChange={(e) => updateRole(member.userId, e.target.value as (typeof manageableRoles)[number]["value"])}
                          className="appearance-none border border-[var(--color-border)] bg-[var(--color-bg-primary)] py-1 pl-2 pr-6 text-xs text-[var(--color-text-primary)]"
                        >
                          {assignableRoles.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-1.5 size-3 text-[var(--color-text-tertiary)]" />
                      </div>
                    ) : (
                      <RoleBadge role={member.workspaceRole} />
                    )}
                  </td>

                  <td className="hidden px-4 py-3 lg:table-cell">
                    <StatusDot status={member.status} />
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
                      {canRemove && (
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
                  {search.trim() ? "No members match your search." : "No members in workspace yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
