"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useMutation } from "@tanstack/react-query";
import { Filter, Plus, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { BoardColumnView } from "@/components/board/board-column";
import { CreateIssueDialog } from "@/components/board/create-issue-dialog";
import { CreateStatusDialog } from "@/components/board/create-status-dialog";
import { IssueCard } from "@/components/board/issue-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BoardColumn, BoardIssue } from "@/types/domain";

interface KanbanBoardProps {
  projectId: string;
  projectKey: string;
  initialColumns: BoardColumn[];
  members: Array<{ id: string; name: string; avatarUrl?: string | null }>;
  sprints: Array<{ id: string; name: string }>;
  currentUserId?: string | null;
  canDeleteColumns?: boolean;
  canManageColumns?: boolean;
}

function findIssue(columns: BoardColumn[], issueId: string) {
  for (const column of columns) {
    const issue = column.issues.find((candidate) => candidate.id === issueId);
    if (issue) {
      return { columnId: column.id, issue };
    }
  }

  return null;
}

export function KanbanBoard({
  projectId,
  projectKey,
  initialColumns,
  members,
  sprints,
  currentUserId,
  canDeleteColumns = false,
  canManageColumns = false,
}: KanbanBoardProps) {
  const [columns, setColumns] = useState(initialColumns);
  const [activeIssue, setActiveIssue] = useState<BoardIssue | null>(null);
  const [issueCreateStatusId, setIssueCreateStatusId] = useState<string | null>(null);
  const [isCreateColumnOpen, setIsCreateColumnOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | BoardIssue["type"]>("all");
  const [showStories, setShowStories] = useState(false);
  const [showEpics, setShowEpics] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<"all" | BoardIssue["priority"]>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<"all" | "me" | "unassigned" | string>("all");
  const [reporterFilter, setReporterFilter] = useState<"all" | "me" | string>("all");
  const [sprintFilter, setSprintFilter] = useState<"all" | "backlog" | string>("all");
  const [hideDoneColumns, setHideDoneColumns] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const statusMap = useMemo(() => new Map(columns.map((column) => [column.id, column])), [columns]);
  const hasActiveFilters = Boolean(
    search.trim() ||
      typeFilter !== "all" ||
      showStories ||
      showEpics ||
      priorityFilter !== "all" ||
      assigneeFilter !== "all" ||
      reporterFilter !== "all" ||
      sprintFilter !== "all" ||
      hideDoneColumns,
  );

  const moveIssue = useMutation({
    mutationFn: async ({ issueId, statusId, position }: { issueId: string; statusId: string; position: number }) => {
      const response = await fetch(`/api/issues/${issueId}/move`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusId, position }),
      });

      if (!response.ok) {
        throw new Error("Failed to persist issue movement");
      }

      return response.json();
    },
  });

  const createIssue = useMutation({
    mutationFn: async ({
      statusId,
      payload,
    }: {
      statusId: string;
      payload: {
        type: BoardIssue["type"];
        title: string;
        priority: BoardIssue["priority"];
        storyPoints?: number;
        assigneeId?: string;
        sprintId?: string;
        parentId?: string;
        epicId?: string;
      };
    }) => {
      const response = await fetch(`/api/projects/${projectId}/issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          statusId,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Failed to create issue");
      }

      const result = (await response.json()) as {
        data: {
          id: string;
          key: string;
          type: BoardIssue["type"];
          title: string;
          priority: BoardIssue["priority"];
          storyPoints?: number | null;
          statusId: string;
          position?: number | null;
          assigneeId?: string | null;
          sprintId?: string | null;
          reporterId?: string | null;
          parentId?: string | null;
          epicId?: string | null;
          description?: string | null;
        };
      };

      return result.data;
    },
    onSuccess: (created, variables) => {
      const assignee = members.find((member) => member.id === variables.payload.assigneeId);
      const assigneeName = assignee?.name ?? null;
      const assigneeAvatarUrl = assignee?.avatarUrl ?? null;
      setColumns((current) =>
        current.map((column) => {
          if (column.id !== variables.statusId) {
            return column;
          }

          return {
            ...column,
            issues: [
              ...column.issues,
              {
                id: created.id,
                key: created.key,
                type: created.type,
                title: created.title,
                description: created.description,
                priority: created.priority,
                storyPoints: created.storyPoints,
                assigneeId: created.assigneeId ?? null,
                assigneeName,
                assigneeAvatarUrl,
                reporterId: currentUserId ?? null,
                parentId: created.parentId ?? null,
                epicId: created.epicId ?? null,
                sprintId: created.sprintId ?? null,
                statusId: created.statusId,
                position: created.position ?? column.issues.length,
              },
            ],
          };
        }),
      );
      setIssueCreateStatusId(null);
    },
  });

  const createStatus = useMutation({
    mutationFn: async (payload: { name: string; category: "todo" | "in_progress" | "done"; color?: string }) => {
      const response = await fetch(`/api/projects/${projectId}/board/statuses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Failed to create board status");
      }

      const result = (await response.json()) as {
        data: {
          id: string;
          name: string;
          category: "todo" | "in_progress" | "done";
          color?: string | null;
        };
      };

      return result.data;
    },
    onSuccess: (status) => {
      setColumns((current) => [...current, { ...status, issues: [] }]);
      setIsCreateColumnOpen(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create board column");
    },
  });

  const deleteStatus = useMutation({
    mutationFn: async (statusId: string) => {
      const response = await fetch(`/api/projects/${projectId}/board/statuses/${statusId}`, {
        method: "DELETE",
      });

      const payload = (await response.json()) as { data?: { statusId: string }; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to delete column");
      }

      return payload.data?.statusId ?? statusId;
    },
    onSuccess: (statusId) => {
      setColumns((current) => current.filter((column) => column.id !== statusId));
      toast.success("Column deleted");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete column");
    },
  });

  const filteredColumns = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return columns
      .filter((column) => (hideDoneColumns ? column.category !== "done" : true))
      .map((column) => ({
        ...column,
        issues: column.issues.filter((issue) => {
          const matchesSearch =
            !normalizedSearch ||
            issue.key.toLowerCase().includes(normalizedSearch) ||
            issue.title.toLowerCase().includes(normalizedSearch);

          const matchesType = typeFilter === "all" ? true : issue.type === typeFilter;
          const matchesStoryEpicVisibility =
            issue.type === "story" ? showStories : issue.type === "epic" ? showEpics : true;
          const matchesPriority = priorityFilter === "all" ? true : issue.priority === priorityFilter;
          const matchesAssignee =
            assigneeFilter === "all"
              ? true
              : assigneeFilter === "me"
                ? Boolean(currentUserId && issue.assigneeId === currentUserId)
                : assigneeFilter === "unassigned"
                  ? !issue.assigneeId
                  : issue.assigneeId === assigneeFilter;
          const matchesReporter =
            reporterFilter === "all"
              ? true
              : reporterFilter === "me"
                ? Boolean(currentUserId && issue.reporterId === currentUserId)
                : issue.reporterId === reporterFilter;
          const matchesSprint =
            sprintFilter === "all"
              ? true
              : sprintFilter === "backlog"
                ? !issue.sprintId
                : issue.sprintId === sprintFilter;

          return (
            matchesSearch &&
            matchesType &&
            matchesStoryEpicVisibility &&
            matchesPriority &&
            matchesAssignee &&
            matchesReporter &&
            matchesSprint
          );
        }),
      }));
  }, [
    assigneeFilter,
    columns,
    currentUserId,
    hideDoneColumns,
    priorityFilter,
    reporterFilter,
    search,
    showEpics,
    showStories,
    sprintFilter,
    typeFilter,
  ]);

  const visibleIssueCount = useMemo(
    () => filteredColumns.reduce((count, column) => count + column.issues.length, 0),
    [filteredColumns],
  );
  const totalIssueCount = useMemo(
    () => columns.reduce((count, column) => count + column.issues.length, 0),
    [columns],
  );

  const totalIssueCountByColumn = useMemo(() => {
    const map = new Map<string, number>();
    columns.forEach((column) => {
      map.set(column.id, column.issues.length);
    });
    return map;
  }, [columns]);

  const issueHierarchyOptions = useMemo(
    () =>
      columns.flatMap((column) =>
        column.issues.map((issue) => ({
          id: issue.id,
          key: issue.key,
          title: issue.title,
          type: issue.type,
          epicId: issue.epicId ?? null,
        })),
      ),
    [columns],
  );
  const fitColumnsInViewport = filteredColumns.length > 0 && filteredColumns.length <= 3;

  function clearFilters() {
    setSearch("");
    setTypeFilter("all");
    setShowStories(false);
    setShowEpics(false);
    setPriorityFilter("all");
    setAssigneeFilter("all");
    setReporterFilter("all");
    setSprintFilter("all");
    setHideDoneColumns(false);
  }

  function requestDeleteColumn(statusId: string, issueCount: number) {
    if (!canDeleteColumns) {
      return;
    }

    if (issueCount > 0) {
      toast.error("Move all issues out of this column before deleting it");
      return;
    }

    toast.warning("Delete this column?", {
      description: "This action is permanent.",
      action: {
        label: "Delete",
        onClick: () => deleteStatus.mutate(statusId),
      },
    });
  }

  const onDragStart = (event: DragStartEvent) => {
    const issueId = String(event.active.id);
    const hit = findIssue(columns, issueId);
    setActiveIssue(hit?.issue ?? null);
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveIssue(null);

    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const source = findIssue(columns, String(active.id));
    if (!source) {
      return;
    }

    const targetIssue = findIssue(columns, String(over.id));
    const overId = String(over.id);
    const targetColumnId = targetIssue?.columnId ?? (statusMap.has(overId) ? overId : String(over.id));

    const sourceColumnIndex = columns.findIndex((column) => column.id === source.columnId);
    const targetColumnIndex = columns.findIndex((column) => column.id === targetColumnId);

    if (sourceColumnIndex === -1 || targetColumnIndex === -1) {
      return;
    }

    const sourceColumn = columns[sourceColumnIndex];
    const targetColumn = columns[targetColumnIndex];

    const sourceIssueIndex = sourceColumn.issues.findIndex((issue) => issue.id === source.issue.id);

    if (sourceIssueIndex === -1) {
      return;
    }

    const nextColumns = structuredClone(columns);

    if (sourceColumn.id === targetColumn.id) {
      const overIssueIndex = targetColumn.issues.findIndex((issue) => issue.id === over.id);
      const targetIndex =
        String(over.id) === sourceColumn.id
          ? nextColumns[sourceColumnIndex].issues.length - 1
          : Math.max(overIssueIndex, 0);
      const nextIssues = arrayMove(nextColumns[sourceColumnIndex].issues, sourceIssueIndex, targetIndex);
      nextColumns[sourceColumnIndex].issues = nextIssues.map((issue, index) => ({ ...issue, position: index }));
      setColumns(nextColumns);

      const moved = nextColumns[sourceColumnIndex].issues.find((issue) => issue.id === source.issue.id);
      if (moved) {
        moveIssue.mutate({ issueId: moved.id, statusId: nextColumns[sourceColumnIndex].id, position: moved.position });
      }

      return;
    }

    const [movedIssue] = nextColumns[sourceColumnIndex].issues.splice(sourceIssueIndex, 1);
    const overIssueIndex = nextColumns[targetColumnIndex].issues.findIndex((issue) => issue.id === over.id);
    const insertIndex = overIssueIndex >= 0 ? overIssueIndex : nextColumns[targetColumnIndex].issues.length;

    const issueWithStatus = { ...movedIssue, statusId: nextColumns[targetColumnIndex].id };
    nextColumns[targetColumnIndex].issues.splice(insertIndex, 0, issueWithStatus);

    nextColumns[sourceColumnIndex].issues = nextColumns[sourceColumnIndex].issues.map((issue, index) => ({
      ...issue,
      position: index,
    }));
    nextColumns[targetColumnIndex].issues = nextColumns[targetColumnIndex].issues.map((issue, index) => ({
      ...issue,
      position: index,
    }));

    setColumns(nextColumns);

    const moved = nextColumns[targetColumnIndex].issues.find((issue) => issue.id === movedIssue.id);
    if (moved) {
      moveIssue.mutate({ issueId: moved.id, statusId: nextColumns[targetColumnIndex].id, position: moved.position });
    }
  };

  return (
    <>
      <div className="mb-2 space-y-1.5 px-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-[var(--color-text-secondary)]">
            Drag issues between columns. Use filters to focus by type, assignee, reporter, sprint, and priority.
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant={hideDoneColumns ? "primary" : "secondary"}
              size="sm"
              onClick={() => setHideDoneColumns((current) => !current)}
            >
              Hide Done
            </Button>
            {canManageColumns ? (
              <Button variant="secondary" size="sm" onClick={() => setIsCreateColumnOpen(true)}>
                <Plus className="mr-1 size-4" />
                Add Column
              </Button>
            ) : null}
          </div>
        </div>

        <div className="border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-2.5 shadow-[var(--shadow-sm)]">
          <div className="mb-2 flex items-center gap-2 border-b border-[var(--color-border)] pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">
            <Filter className="size-3.5 text-[var(--color-accent-primary)]" />
            Board Filters
          </div>
          <div className="grid gap-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Input
              placeholder="Search by issue key or summary"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-9 border-[var(--color-border)] bg-[var(--color-bg-primary)]"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as "all" | BoardIssue["type"])}
            className="h-9 w-full min-w-0 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 text-sm"
          >
            <option value="all">All Types</option>
            <option value="task">Task</option>
            <option value="bug">Bug</option>
            <option value="subtask">Subtask</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value as "all" | BoardIssue["priority"])}
            className="h-9 w-full min-w-0 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 text-sm"
          >
            <option value="all">All Priorities</option>
            <option value="highest">Highest</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="lowest">Lowest</option>
          </select>
          <select
            value={assigneeFilter}
            onChange={(event) => setAssigneeFilter(event.target.value)}
            className="h-9 w-full min-w-0 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 text-sm"
          >
            <option value="all">All Assignees</option>
            {currentUserId ? <option value="me">Assigned to me</option> : null}
            <option value="unassigned">Unassigned</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
          <select
            value={sprintFilter}
            onChange={(event) => setSprintFilter(event.target.value)}
            className="h-9 w-full min-w-0 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 text-sm"
          >
            <option value="all">All Sprints</option>
            <option value="backlog">Backlog (No Sprint)</option>
            {sprints.map((sprint) => (
              <option key={sprint.id} value={sprint.id}>
                {sprint.name}
              </option>
            ))}
          </select>

          <select
            value={reporterFilter}
            onChange={(event) => setReporterFilter(event.target.value)}
            className="h-9 w-full min-w-0 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 text-sm lg:col-span-2"
          >
            <option value="all">All Reporters</option>
            {currentUserId ? <option value="me">Reported by me</option> : null}
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2 lg:col-span-4">
            <label className="inline-flex items-center gap-1 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-1 text-xs text-[var(--color-text-secondary)]">
              <input
                type="checkbox"
                checked={showStories}
                onChange={(event) => setShowStories(event.target.checked)}
                className="h-3.5 w-3.5 accent-[var(--color-accent-primary)]"
              />
              Show Stories
            </label>
            <label className="inline-flex items-center gap-1 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-1 text-xs text-[var(--color-text-secondary)]">
              <input
                type="checkbox"
                checked={showEpics}
                onChange={(event) => setShowEpics(event.target.checked)}
                className="h-3.5 w-3.5 accent-[var(--color-accent-primary)]"
              />
              Show Epics
            </label>
            <div className="inline-flex items-center gap-1 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-1 text-xs text-[var(--color-text-secondary)]">
              <Filter className="size-3 text-[var(--color-accent-primary)]" />
              {visibleIssueCount}/{totalIssueCount} issues shown
            </div>
            {hasActiveFilters ? (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <RotateCcw className="mr-1 size-3.5" />
                Clear filters
              </Button>
            ) : null}
          </div>
        </div>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={(args) => {
          const pointerHits = pointerWithin(args);
          return pointerHits.length > 0 ? pointerHits : closestCorners(args);
        }}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveIssue(null)}
      >
        <motion.div
          className={cn(
            "flex gap-4 border-t border-[var(--color-border)] p-4",
            fitColumnsInViewport
              ? "w-full overflow-x-auto lg:overflow-x-visible"
              : "w-max min-w-full overflow-x-auto",
          )}
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
          }}
        >
          {filteredColumns.map((column) => (
            <BoardColumnView
              key={column.id}
              column={column}
              onAddIssue={setIssueCreateStatusId}
              onDeleteColumn={requestDeleteColumn}
              canDeleteColumn={canDeleteColumns}
              deleting={deleteStatus.isPending && deleteStatus.variables === column.id}
              fitToContainer={fitColumnsInViewport}
              totalIssueCount={totalIssueCountByColumn.get(column.id)}
            />
          ))}
        </motion.div>

        {visibleIssueCount === 0 ? (
          <div className="px-4 pb-4">
            <div className="border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6 text-center text-sm text-[var(--color-text-secondary)] shadow-[var(--shadow-sm)]">
              No issues match the current filters.
            </div>
          </div>
        ) : null}

        <DragOverlay>{activeIssue ? <IssueCard issue={activeIssue} dragOverlay /> : null}</DragOverlay>

        {moveIssue.isPending && (
          <div className="fixed bottom-4 right-4 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-xs text-[var(--color-text-secondary)] shadow-[var(--shadow-md)]">
            Syncing board changes...
          </div>
        )}

        {moveIssue.isError && (
          <div className="fixed bottom-4 right-4 border border-[var(--color-error)] bg-[var(--color-bg-secondary)] px-3 py-2 text-xs text-[var(--color-error)] shadow-[var(--shadow-md)]">
            Failed to sync issue move
          </div>
        )}
      </DndContext>

      <CreateIssueDialog
        open={Boolean(issueCreateStatusId)}
        onOpenChange={(open) => {
          if (!open) {
            setIssueCreateStatusId(null);
          }
        }}
        projectKey={projectKey}
        statusName={issueCreateStatusId ? statusMap.get(issueCreateStatusId)?.name : undefined}
        onCreate={async (payload) => {
          const statusId = issueCreateStatusId;
          if (!statusId || !statusMap.get(statusId)) {
            throw new Error("Invalid status");
          }

          await createIssue.mutateAsync({ statusId, payload });
        }}
        members={members}
        sprints={sprints}
        issues={issueHierarchyOptions}
        loading={createIssue.isPending}
      />

      <CreateStatusDialog
        open={isCreateColumnOpen}
        onOpenChange={setIsCreateColumnOpen}
        onCreate={async (payload) => {
          await createStatus.mutateAsync(payload);
        }}
        loading={createStatus.isPending}
      />
    </>
  );
}


