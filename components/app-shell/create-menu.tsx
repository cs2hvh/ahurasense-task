"use client";

import { Plus } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { canCreateWorkspaceWithRole } from "@/lib/access";

type IssueType = "story" | "task" | "bug" | "epic" | "subtask";
type IssuePriority = "lowest" | "low" | "medium" | "high" | "highest";

type WorkspacePayload = {
  data: {
    projects: Array<{ id: string; key: string }>;
  };
};

type BoardPayload = {
  data: {
    statuses: Array<{ id: string; name: string }>;
  };
};

type SprintPayload = {
  data: Array<{ id: string; name: string }>;
};

type CreateIssuePayload = {
  data: {
    key: string;
  };
  error?: string;
};

export function CreateMenu() {
  const { data: session } = useSession();
  const router = useRouter();
  const { workspaceSlug, projectKey } = useParams<{ workspaceSlug?: string; projectKey?: string }>();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Array<{ id: string; name: string }>>([]);
  const [sprints, setSprints] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<IssueType>("task");
  const [priority, setPriority] = useState<IssuePriority>("medium");
  const [storyPoints, setStoryPoints] = useState("");
  const [statusId, setStatusId] = useState("");
  const [sprintId, setSprintId] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const canCreateWorkspace = canCreateWorkspaceWithRole(session?.user?.role);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    setProjectId(null);
    setStatuses([]);
    setSprints([]);
    setStatusId("");
    setSprintId("");
    setTitle("");
    setType("task");
    setPriority("medium");
    setStoryPoints("");
  }, [projectKey, workspaceSlug]);

  async function loadProjectMeta() {
    if (!workspaceSlug || !projectKey) {
      return;
    }
    if (projectId && statuses.length) {
      return;
    }

    setLoadingMeta(true);
    try {
      const workspaceRes = await fetch(`/api/workspaces/by-slug/${workspaceSlug}`);
      if (!workspaceRes.ok) {
        throw new Error("Failed to load workspace details");
      }
      const workspacePayload = (await workspaceRes.json()) as WorkspacePayload;
      const project = workspacePayload.data.projects.find((item) => item.key === projectKey);
      if (!project) {
        throw new Error("Project not found in workspace");
      }

      const [boardRes, sprintRes] = await Promise.all([
        fetch(`/api/projects/${project.id}/board`),
        fetch(`/api/projects/${project.id}/sprints`),
      ]);

      if (!boardRes.ok) {
        throw new Error("Failed to load project board metadata");
      }
      if (!sprintRes.ok) {
        throw new Error("Failed to load project sprints");
      }

      const boardPayload = (await boardRes.json()) as BoardPayload;
      const sprintPayload = (await sprintRes.json()) as SprintPayload;
      const nextStatuses = boardPayload.data.statuses ?? [];
      setProjectId(project.id);
      setStatuses(nextStatuses);
      setSprints(sprintPayload.data ?? []);
      setStatusId((current) => current || nextStatuses[0]?.id || "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load project metadata");
    } finally {
      setLoadingMeta(false);
    }
  }

  function resetIssueForm() {
    setTitle("");
    setType("task");
    setPriority("medium");
    setStoryPoints("");
    setSprintId("");
  }

  async function submitQuickIssue(event: React.FormEvent) {
    event.preventDefault();
    if (!projectId) {
      toast.error("Select a project context to create an issue.");
      return;
    }
    if (!title.trim()) {
      toast.error("Issue summary is required.");
      return;
    }
    if (!statusId) {
      toast.error("Issue status is required.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          type,
          priority,
          statusId,
          ...(storyPoints ? { storyPoints: Number(storyPoints) } : {}),
          ...(sprintId ? { sprintId } : {}),
        }),
      });
      const payload = (await response.json()) as CreateIssuePayload;
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to create issue");
      }

      toast.success(`Issue ${payload.data.key} created`);
      resetIssueForm();
      setIsIssueModalOpen(false);
      if (workspaceSlug && projectKey) {
        router.push(`/w/${workspaceSlug}/p/${projectKey}/issues/${payload.data.key}`);
        router.refresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create issue");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div ref={menuRef} className="relative">
        <Button variant="primary" size="sm" onClick={() => setIsMenuOpen((open) => !open)}>
          <Plus className="mr-1 size-4" />
          Create
        </Button>
        {isMenuOpen ? (
          <div className="absolute right-0 top-full z-40 mt-1.5 min-w-[220px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-1 shadow-[var(--shadow-lg)]">
            {workspaceSlug && projectKey ? (
              <button
                onClick={async () => {
                  setIsMenuOpen(false);
                  setIsIssueModalOpen(true);
                  await loadProjectMeta();
                }}
                className="flex w-full items-center justify-between border border-transparent px-2 py-2 text-left text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-border)] hover:bg-[var(--color-bg-primary)] hover:text-[var(--color-text-primary)]"
              >
                <span>Create Issue</span>
                <span className="text-xs text-[var(--color-text-tertiary)]">I</span>
              </button>
            ) : null}

            {workspaceSlug && projectKey ? (
              <Link
                href={`/w/${workspaceSlug}/p/${projectKey}/sprints`}
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center border border-transparent px-2 py-2 text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-border)] hover:bg-[var(--color-bg-primary)] hover:text-[var(--color-text-primary)]"
              >
                Create Sprint
              </Link>
            ) : null}

            {workspaceSlug ? (
              <Link
                href={`/w/${workspaceSlug}`}
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center border border-transparent px-2 py-2 text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-border)] hover:bg-[var(--color-bg-primary)] hover:text-[var(--color-text-primary)]"
              >
                Create Project
              </Link>
            ) : null}

            {canCreateWorkspace ? (
              <Link
                href="/workspaces"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center border border-transparent px-2 py-2 text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-border)] hover:bg-[var(--color-bg-primary)] hover:text-[var(--color-text-primary)]"
              >
                Create Workspace
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      <Modal open={isIssueModalOpen} onOpenChange={setIsIssueModalOpen} title="Quick Create Issue">
        {!workspaceSlug || !projectKey ? (
          <p className="text-sm text-[var(--color-text-secondary)]">Open a project first to create an issue from the navbar.</p>
        ) : (
          <form className="grid gap-3" onSubmit={submitQuickIssue}>
            <div className="grid gap-1">
              <label className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Summary</label>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Write API integration tests" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-1">
                <label className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Type</label>
                <select value={type} onChange={(event) => setType(event.target.value as IssueType)} className="h-10 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3">
                  <option value="task">Task</option>
                  <option value="story">Story</option>
                  <option value="bug">Bug</option>
                  <option value="epic">Epic</option>
                  <option value="subtask">Subtask</option>
                </select>
              </div>
              <div className="grid gap-1">
                <label className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Priority</label>
                <select value={priority} onChange={(event) => setPriority(event.target.value as IssuePriority)} className="h-10 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3">
                  <option value="lowest">Lowest</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="highest">Highest</option>
                </select>
              </div>
              <div className="grid gap-1">
                <label className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Story Points</label>
                <Input type="number" min={0} max={100} value={storyPoints} onChange={(event) => setStoryPoints(event.target.value)} placeholder="3" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1">
                <label className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Status</label>
                <select
                  value={statusId}
                  onChange={(event) => setStatusId(event.target.value)}
                  disabled={loadingMeta}
                  className="h-10 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 disabled:opacity-60"
                >
                  {!statuses.length ? <option value="">No statuses</option> : null}
                  {statuses.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1">
                <label className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Sprint</label>
                <select
                  value={sprintId}
                  onChange={(event) => setSprintId(event.target.value)}
                  disabled={loadingMeta}
                  className="h-10 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 disabled:opacity-60"
                >
                  <option value="">Backlog</option>
                  {sprints.map((sprint) => (
                    <option key={sprint.id} value={sprint.id}>
                      {sprint.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setIsIssueModalOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || loadingMeta}>
                {saving ? "Creating..." : "Create Issue"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
