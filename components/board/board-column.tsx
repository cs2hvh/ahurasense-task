"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

import { SortableIssueCard } from "@/components/board/sortable-issue-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BoardColumn } from "@/types/domain";

export function BoardColumnView({
  column,
  onAddIssue,
  onDeleteColumn,
  canDeleteColumn = false,
  deleting = false,
  fitToContainer = false,
  totalIssueCount,
}: {
  column: BoardColumn;
  onAddIssue: (statusId: string) => void;
  onDeleteColumn?: (statusId: string, issueCount: number) => void;
  canDeleteColumn?: boolean;
  deleting?: boolean;
  fitToContainer?: boolean;
  totalIssueCount?: number;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: "column",
      columnId: column.id,
    },
  });

  return (
    <motion.section
      layout
      className={cn(
        "flex max-h-[min(68vh,720px)] self-start flex-col border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-[var(--shadow-sm)]",
        fitToContainer
          ? "min-w-[304px] max-w-[304px] lg:min-w-0 lg:max-w-none lg:flex-1"
          : "min-w-[304px] max-w-[304px]",
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <header className="flex items-center justify-between border-b border-[var(--color-border)] bg-[rgba(10,10,11,0.25)] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 bg-[var(--color-accent-primary)]" style={{ backgroundColor: column.color ?? "var(--color-accent-primary)" }} />
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{column.name}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="border border-[var(--color-border)] bg-[rgba(10,10,11,0.3)] px-1.5 py-0.5 text-[11px] text-[var(--color-text-secondary)]">
            {typeof totalIssueCount === "number" && totalIssueCount !== column.issues.length ? `${column.issues.length}/${totalIssueCount}` : column.issues.length}
          </span>
          {canDeleteColumn ? (
            <button
              type="button"
              className="inline-flex h-6 w-6 items-center justify-center border border-[var(--color-border)] text-[var(--color-text-tertiary)] hover:text-[var(--color-error)]"
              onClick={() => onDeleteColumn?.(column.id, column.issues.length)}
              disabled={deleting}
              aria-label={`Delete ${column.name} column`}
              title="Delete column"
            >
              <Trash2 className="size-3.5" />
            </button>
          ) : null}
        </div>
      </header>

      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 space-y-2 overflow-y-auto bg-[rgba(10,10,11,0.15)] p-3 transition-colors",
          isOver ? "bg-[rgba(0,102,255,0.05)] ring-1 ring-inset ring-[rgba(0,102,255,0.28)]" : "",
        )}
      >
        <SortableContext items={column.issues.map((issue) => issue.id)} strategy={verticalListSortingStrategy}>
          {column.issues.map((issue) => (
            <SortableIssueCard key={issue.id} issue={issue} />
          ))}
        </SortableContext>

        {!column.issues.length ? (
          <div className="border border-dashed border-[var(--color-border)] bg-[rgba(10,10,11,0.18)] px-3 py-6 text-center text-xs text-[var(--color-text-secondary)]">
            No issues
          </div>
        ) : null}
      </div>

      <div className="border-t border-[var(--color-border)] bg-[rgba(10,10,11,0.12)] p-3">
        <Button variant="ghost" size="sm" className="w-full justify-start border border-transparent hover:border-[var(--color-border)]" onClick={() => onAddIssue(column.id)}>
          <Plus className="mr-1 size-4" />
          Add issue
        </Button>
      </div>
    </motion.section>
  );
}


