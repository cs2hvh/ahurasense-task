"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BoardIssue } from "@/types/domain";

interface CreateIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectKey: string;
  statusName?: string;
  onCreate: (payload: {
    type: BoardIssue["type"];
    title: string;
    priority: BoardIssue["priority"];
    storyPoints?: number;
    assigneeId?: string;
    sprintId?: string;
    parentId?: string;
    epicId?: string;
  }) => Promise<void>;
  members: Array<{ id: string; name: string }>;
  sprints: Array<{ id: string; name: string }>;
  issues: Array<{ id: string; key: string; title: string; type: BoardIssue["type"]; epicId?: string | null }>;
  loading: boolean;
}

export function CreateIssueDialog({
  open,
  onOpenChange,
  projectKey,
  statusName,
  onCreate,
  members,
  sprints,
  issues,
  loading,
}: CreateIssueDialogProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<BoardIssue["type"]>("task");
  const [priority, setPriority] = useState<BoardIssue["priority"]>("medium");
  const [storyPoints, setStoryPoints] = useState<string>("");
  const [assigneeId, setAssigneeId] = useState("");
  const [sprintId, setSprintId] = useState("");
  const [parentId, setParentId] = useState("");
  const [epicId, setEpicId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const isDirty = Boolean(
    title.trim() || storyPoints || assigneeId || sprintId || parentId || epicId || type !== "task" || priority !== "medium",
  );

  const epicOptions = issues.filter((issue) => issue.type === "epic");
  const parentOptions =
    type === "subtask"
      ? issues.filter((issue) => issue.type === "story" || issue.type === "task" || issue.type === "bug")
      : type === "task" || type === "bug"
        ? issues.filter((issue) => issue.type === "story")
        : [];

  function resetForm() {
    setTitle("");
    setType("task");
    setPriority("medium");
    setStoryPoints("");
    setAssigneeId("");
    setSprintId("");
    setParentId("");
    setEpicId("");
    setError(null);
  }

  function requestClose() {
    if (loading) {
      return;
    }

    if (isDirty) {
      toast.warning("Unsaved issue details", {
        description: "Click Discard to close and lose entered data.",
        action: {
          label: "Discard",
          onClick: () => {
            resetForm();
            onOpenChange(false);
          },
        },
      });
      return;
    }

    onOpenChange(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (type === "subtask" && !parentId) {
      setError("Subtask must have a parent issue");
      return;
    }

    await onCreate({
      title: title.trim(),
      type,
      priority,
      ...(storyPoints ? { storyPoints: Number(storyPoints) } : {}),
      ...(assigneeId ? { assigneeId } : {}),
      ...(sprintId ? { sprintId } : {}),
      ...(parentId ? { parentId } : {}),
      ...(epicId ? { epicId } : {}),
    });

    resetForm();
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Create Issue" dismissible={false} showCloseButton={false}>
      <form className="grid gap-3" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-3 border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3 md:grid-cols-2">
          <div className="text-xs">
            <p className="uppercase tracking-wide text-[var(--color-text-tertiary)]">Project</p>
            <p className="mt-1 text-[var(--color-text-primary)]">{projectKey}</p>
          </div>
          <div className="text-xs">
            <p className="uppercase tracking-wide text-[var(--color-text-tertiary)]">Status</p>
            <p className="mt-1 text-[var(--color-text-primary)]">{statusName ?? "Selected column"}</p>
          </div>
          <p className="text-[11px] text-[var(--color-text-secondary)] md:col-span-2">Issue key will be generated automatically as `{projectKey}-N`.</p>
        </div>

        <div className="grid gap-1">
          <label className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Summary</label>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Implement SSO login" />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="grid gap-1">
            <label className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Type</label>
            <select
              className="h-10 w-full min-w-0 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3"
              value={type}
              onChange={(event) => {
                const nextType = event.target.value as BoardIssue["type"];
                setType(nextType);
                setError(null);
                if (nextType === "epic") {
                  setParentId("");
                  setEpicId("");
                }
                if (nextType === "story") {
                  setParentId("");
                }
              }}
            >
              <option value="task">Task</option>
              <option value="story">Story</option>
              <option value="bug">Bug</option>
              <option value="epic">Epic</option>
              <option value="subtask">Subtask</option>
            </select>
          </div>

          <div className="grid gap-1">
            <label className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Priority</label>
            <select className="h-10 w-full min-w-0 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3" value={priority} onChange={(event) => setPriority(event.target.value as BoardIssue["priority"])}>
              <option value="lowest">Lowest</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="highest">Highest</option>
            </select>
          </div>
        </div>

        {type !== "epic" ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="grid gap-1">
              <label className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Epic Link</label>
              <select
                className="h-10 w-full min-w-0 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3"
                value={epicId}
                onChange={(event) => setEpicId(event.target.value)}
              >
                <option value="">No epic</option>
                {epicOptions.map((issue) => (
                  <option key={issue.id} value={issue.id}>
                    {issue.key} - {issue.title}
                  </option>
                ))}
              </select>
            </div>

            {type === "task" || type === "bug" || type === "subtask" ? (
              <div className="grid gap-1">
                <label className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
                  {type === "subtask" ? "Parent Issue (Required)" : "Parent Story"}
                </label>
                <select
                  className="h-10 w-full min-w-0 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3"
                  value={parentId}
                  onChange={(event) => {
                    const nextParentId = event.target.value;
                    setParentId(nextParentId);
                    const selectedParent = issues.find((issue) => issue.id === nextParentId);
                    if (selectedParent?.epicId) {
                      setEpicId(selectedParent.epicId);
                    }
                  }}
                >
                  <option value="">{type === "subtask" ? "Select parent issue" : "No parent story"}</option>
                  {parentOptions.map((issue) => (
                    <option key={issue.id} value={issue.id}>
                      {issue.key} - {issue.title}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="grid gap-1">
            <label className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Story Points</label>
            <Input type="number" min={0} max={100} value={storyPoints} onChange={(event) => setStoryPoints(event.target.value)} placeholder="3" />
          </div>

          <div className="grid gap-1">
            <label className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Assignee</label>
            <select className="h-10 w-full min-w-0 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3" value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}>
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1">
            <label className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Sprint</label>
            <select className="h-10 w-full min-w-0 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3" value={sprintId} onChange={(event) => setSprintId(event.target.value)}>
              <option value="">Backlog</option>
              {sprints.map((sprint) => (
                <option key={sprint.id} value={sprint.id}>
                  {sprint.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error ? <p className="text-xs text-[var(--color-error)]">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={requestClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Issue"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}


