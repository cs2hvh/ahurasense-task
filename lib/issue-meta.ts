import type { IssuePriority, IssueType } from "@prisma/client";

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  story: "Story",
  task: "Task",
  bug: "Bug",
  epic: "Epic",
  subtask: "Subtask",
};

export const ISSUE_PRIORITY_LABELS: Record<IssuePriority, string> = {
  lowest: "Lowest",
  low: "Low",
  medium: "Medium",
  high: "High",
  highest: "Highest",
};

export const ISSUE_TYPE_COLORS: Record<IssueType, string> = {
  story: "var(--color-info)",
  task: "var(--color-text-secondary)",
  bug: "var(--color-error)",
  epic: "var(--color-warning)",
  subtask: "var(--color-success)",
};


