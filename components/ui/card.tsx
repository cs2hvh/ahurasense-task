import { type HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-[var(--shadow-sm)]",
        className,
      )}
      {...props}
    />
  );
}


