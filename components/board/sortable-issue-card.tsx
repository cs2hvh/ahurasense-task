"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { usePathname } from "next/navigation";

import { IssueCard } from "@/components/board/issue-card";
import type { BoardIssue } from "@/types/domain";

export function SortableIssueCard({ issue }: { issue: BoardIssue }) {
  const pathname = usePathname();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: issue.id });
  const issueHref = pathname.endsWith("/board")
    ? `${pathname.slice(0, -"/board".length)}/issues/${issue.key}`
    : `${pathname}/issues/${issue.key}`;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={isDragging ? "opacity-40" : "opacity-100"}
      {...attributes}
      {...listeners}
    >
      <IssueCard issue={issue} issueHref={issueHref} />
    </div>
  );
}


