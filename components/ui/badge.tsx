import { cva, type VariantProps } from "class-variance-authority";
import { type HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide", {
  variants: {
    variant: {
      default: "border-[var(--color-border)] text-[var(--color-text-secondary)]",
      success: "border-[var(--color-success)] text-[var(--color-success)]",
      warning: "border-[var(--color-warning)] text-[var(--color-warning)]",
      error: "border-[var(--color-error)] text-[var(--color-error)]",
      info: "border-[var(--color-info)] text-[var(--color-info)]",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

type BadgeProps = HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}


