"use client";

import Link from "next/link";
import { AlertTriangle, ArrowDown, ArrowUp, Bug, CircleDot, GripVertical, Layers, Minus, SquareCheckBig, SplitSquareVertical } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { UserInline } from "@/components/ui/user-inline";
import { ISSUE_TYPE_COLORS, ISSUE_TYPE_LABELS } from "@/lib/issue-meta";
import type { BoardIssue } from "@/types/domain";

function priorityIcon(priority: BoardIssue["priority"]) {
  switch (priority) {
    case "highest":
    case "high":
      return <ArrowUp className="size-3 text-[var(--color-error)]" />;
    case "medium":
      return <Minus className="size-3 text-[var(--color-warning)]" />;
    case "low":
    case "lowest":
      return <ArrowDown className="size-3 text-[var(--color-info)]" />;
    default:
      return <AlertTriangle className="size-3 text-[var(--color-text-tertiary)]" />;
  }
}

function issueTypeIcon(type: BoardIssue["type"]) {
  switch (type) {
    case "bug":
      return <Bug className="size-3" />;
    case "story":
      return <Layers className="size-3" />;
    case "epic":
      return <SquareCheckBig className="size-3" />;
    case "subtask":
      return <SplitSquareVertical className="size-3" />;
    case "task":
    default:
      return <CircleDot className="size-3" />;
  }
}

interface IssueCardProps {
  issue: BoardIssue;
  dragOverlay?: boolean;
  issueHref?: string;
}

export function IssueCard({ issue, dragOverlay = false, issueHref }: IssueCardProps) {
  return (
    <Card
      style={{ borderLeftColor: ISSUE_TYPE_COLORS[issue.type], borderLeftWidth: 2 }}
      className={`min-h-[100px] border-[var(--color-border)] bg-[var(--color-bg-tertiary)] p-3 transition-all duration-200 ${
        dragOverlay
          ? "rotate-1 shadow-[var(--shadow-lg)]"
          : "hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">{issue.key}</span>
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide" style={{ color: ISSUE_TYPE_COLORS[issue.type] }}>
            {issueTypeIcon(issue.type)}
            {ISSUE_TYPE_LABELS[issue.type]}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {!dragOverlay ? <GripVertical className="size-3 text-[var(--color-text-tertiary)]" /> : null}
          {priorityIcon(issue.priority)}
          {issue.storyPoints !== null && issue.storyPoints !== undefined && (
            <Badge className="px-1.5 py-0 text-[10px]" variant="info">
              {issue.storyPoints} SP
            </Badge>
          )}
        </div>
      </div>

      {issueHref ? (
        <Link href={issueHref} className="mb-3 block text-sm font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-accent-primary)]">
          {issue.title}
        </Link>
      ) : (
        <p className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">{issue.title}</p>
      )}

      <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
        <Badge variant="default" className="bg-[rgba(10,10,11,0.2)] text-[10px] normal-case">
          {issue.priority}
        </Badge>
        <div className="flex items-center gap-2">
          <UserInline name={issue.assigneeName} avatarUrl={issue.assigneeAvatarUrl} fallbackLabel="Unassigned" size="xs" />
          {issueHref ? (
            <Link href={issueHref} className="font-semibold text-[var(--color-accent-primary)] hover:text-[var(--color-accent-hover)]">
              Open
            </Link>
          ) : null}
        </div>
      </div>
    </Card>
  );
}


