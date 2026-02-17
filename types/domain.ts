export interface BoardIssue {
  id: string;
  key: string;
  type: "story" | "task" | "bug" | "epic" | "subtask";
  title: string;
  priority: "lowest" | "low" | "medium" | "high" | "highest";
  storyPoints?: number | null;
  assigneeId?: string | null;
  assigneeName?: string | null;
  assigneeAvatarUrl?: string | null;
  reporterId?: string | null;
  reporterName?: string | null;
  reporterAvatarUrl?: string | null;
  parentId?: string | null;
  epicId?: string | null;
  sprintId?: string | null;
  description?: string | null;
  statusId: string;
  position: number;
}

export interface BoardColumn {
  id: string;
  name: string;
  category: "todo" | "in_progress" | "done";
  color?: string | null;
  wipLimit?: number | null;
  issues: BoardIssue[];
}

