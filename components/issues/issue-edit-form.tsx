"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface IssueEditFormProps {
  issueId: string;
  canEdit: boolean;
  initial: {
    title: string;
    description: string | null;
    type: "story" | "task" | "bug" | "epic" | "subtask";
    priority: "lowest" | "low" | "medium" | "high" | "highest";
    statusId: string;
    assigneeId: string | null;
    parentId: string | null;
    epicId: string | null;
    sprintId: string | null;
    storyPoints: number | null;
    dueDate: string | null;
  };
  statuses: Array<{ id: string; name: string }>;
  members: Array<{ id: string; name: string }>;
  sprints: Array<{ id: string; name: string }>;
  issues: Array<{ id: string; key: string; title: string; type: "story" | "task" | "bug" | "epic" | "subtask"; epicId: string | null }>;
}

export function IssueEditForm({ issueId, canEdit, initial, statuses, members, sprints, issues }: IssueEditFormProps) {
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? "");
  const [type, setType] = useState(initial.type);
  const [priority, setPriority] = useState(initial.priority);
  const [statusId, setStatusId] = useState(initial.statusId);
  const [assigneeId, setAssigneeId] = useState(initial.assigneeId ?? "");
  const [parentId, setParentId] = useState(initial.parentId ?? "");
  const [epicId, setEpicId] = useState(initial.epicId ?? "");
  const [sprintId, setSprintId] = useState(initial.sprintId ?? "");
  const [storyPoints, setStoryPoints] = useState(initial.storyPoints?.toString() ?? "");
  const [dueDate, setDueDate] = useState(initial.dueDate ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const epicOptions = issues.filter((issue) => issue.type === "epic" && issue.id !== issueId);
  const parentOptions =
    type === "subtask"
      ? issues.filter((issue) => issue.id !== issueId && (issue.type === "story" || issue.type === "task" || issue.type === "bug"))
      : type === "task" || type === "bug"
        ? issues.filter((issue) => issue.id !== issueId && issue.type === "story")
        : [];

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!canEdit) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (type === "subtask" && !parentId) {
        throw new Error("Subtask must have a parent issue");
      }

      const response = await fetch(`/api/issues/${issueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          type,
          priority,
          statusId,
          assigneeId: assigneeId || null,
          parentId: type === "epic" || type === "story" ? null : parentId || null,
          epicId: type === "epic" ? null : epicId || null,
          sprintId: sprintId || null,
          storyPoints: storyPoints ? Number(storyPoints) : null,
          dueDate: dueDate || null,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to update issue");
      }

      setSuccess("Issue updated");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update issue");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-3 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4" onSubmit={handleSave}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Edit Issue</h2>

      {!canEdit ? (
        <p className="text-xs text-[var(--color-warning)]">
          Only workspace owners, admins, or the issue owner can edit this issue.
        </p>
      ) : null}

      <div className="grid gap-1">
        <label className="text-xs text-[var(--color-text-tertiary)]">Summary</label>
        <Input value={title} onChange={(event) => setTitle(event.target.value)} disabled={!canEdit || saving} />
      </div>

      <div className="grid gap-1">
        <label className="text-xs text-[var(--color-text-tertiary)]">Description</label>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
          disabled={!canEdit || saving}
          className="w-full border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3 text-sm outline-none focus:border-[var(--color-accent-primary)] disabled:opacity-60"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid min-w-0 gap-1">
          <label className="text-xs text-[var(--color-text-tertiary)]">Type</label>
          <select
            value={type}
            onChange={(event) => {
              const nextType = event.target.value as typeof type;
              setType(nextType);
              if (nextType === "epic") {
                setParentId("");
                setEpicId("");
              } else if (nextType === "story") {
                setParentId("");
              }
            }}
            disabled={!canEdit || saving}
            className="h-10 w-full min-w-0 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3"
          >
            <option value="task">Task</option>
            <option value="story">Story</option>
            <option value="bug">Bug</option>
            <option value="epic">Epic</option>
            <option value="subtask">Subtask</option>
          </select>
        </div>
        <div className="grid min-w-0 gap-1">
          <label className="text-xs text-[var(--color-text-tertiary)]">Priority</label>
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value as typeof priority)}
            disabled={!canEdit || saving}
            className="h-10 w-full min-w-0 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3"
          >
            <option value="lowest">Lowest</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="highest">Highest</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid min-w-0 gap-1">
          <label className="text-xs text-[var(--color-text-tertiary)]">Status</label>
          <select
            value={statusId}
            onChange={(event) => setStatusId(event.target.value)}
            disabled={!canEdit || saving}
            className="h-10 w-full min-w-0 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3"
          >
            {statuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid min-w-0 gap-1">
          <label className="text-xs text-[var(--color-text-tertiary)]">Assignee</label>
          <select
            value={assigneeId}
            onChange={(event) => setAssigneeId(event.target.value)}
            disabled={!canEdit || saving}
            className="h-10 w-full min-w-0 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3"
          >
            <option value="">Unassigned</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {type !== "epic" ? (
        <div className="grid grid-cols-1 gap-3">
          <div className="grid min-w-0 gap-1">
            <label className="text-xs text-[var(--color-text-tertiary)]">Epic Link</label>
            <select
              value={epicId}
              onChange={(event) => setEpicId(event.target.value)}
              disabled={!canEdit || saving}
              className="h-10 w-full min-w-0 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3"
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
            <div className="grid min-w-0 gap-1">
              <label className="text-xs text-[var(--color-text-tertiary)]">{type === "subtask" ? "Parent Issue (Required)" : "Parent Story"}</label>
              <select
                value={parentId}
                onChange={(event) => {
                  const nextParentId = event.target.value;
                  setParentId(nextParentId);
                  const selectedParent = issues.find((issue) => issue.id === nextParentId);
                  if (selectedParent?.epicId) {
                    setEpicId(selectedParent.epicId);
                  }
                }}
                disabled={!canEdit || saving}
                className="h-10 w-full min-w-0 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3"
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

      <div className="grid gap-3">
        <div className="grid min-w-0 gap-1">
          <label className="text-xs text-[var(--color-text-tertiary)]">Sprint</label>
          <select
            value={sprintId}
            onChange={(event) => setSprintId(event.target.value)}
            disabled={!canEdit || saving}
            className="h-10 w-full min-w-0 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3"
          >
            <option value="">Backlog</option>
            {sprints.map((sprint) => (
              <option key={sprint.id} value={sprint.id}>
                {sprint.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid min-w-0 gap-1">
            <label className="text-xs text-[var(--color-text-tertiary)]">Story Points</label>
            <Input type="number" min={0} max={100} value={storyPoints} onChange={(event) => setStoryPoints(event.target.value)} disabled={!canEdit || saving} />
          </div>
          <div className="grid min-w-0 gap-1">
            <label className="text-xs text-[var(--color-text-tertiary)]">Due Date</label>
            <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} disabled={!canEdit || saving} className="min-w-0" />
          </div>
        </div>
      </div>

      {error ? <p className="text-xs text-[var(--color-error)]">{error}</p> : null}
      {success ? <p className="text-xs text-[var(--color-success)]">{success}</p> : null}

      <Button type="submit" size="sm" disabled={!canEdit || saving}>
        {saving ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
