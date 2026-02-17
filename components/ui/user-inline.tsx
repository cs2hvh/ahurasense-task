"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserInlineProps {
  name?: string | null;
  avatarUrl?: string | null;
  fallbackLabel?: string;
  size?: "xs" | "sm" | "md";
  className?: string;
  textClassName?: string;
}

const SIZE_CLASSES: Record<NonNullable<UserInlineProps["size"]>, string> = {
  xs: "size-5",
  sm: "size-6",
  md: "size-7",
};

function getInitials(name: string) {
  const parts = name
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);

  if (!parts.length) {
    return "U";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function UserInline({
  name,
  avatarUrl,
  fallbackLabel = "Unassigned",
  size = "sm",
  className,
  textClassName,
}: UserInlineProps) {
  if (!name) {
    return <span className={cn("text-xs text-[var(--color-text-secondary)]", textClassName)}>{fallbackLabel}</span>;
  }

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
      <Avatar className={cn("border-[var(--color-border)]", SIZE_CLASSES[size])}>
        <AvatarImage src={avatarUrl ?? undefined} alt={name} />
        <AvatarFallback>{getInitials(name)}</AvatarFallback>
      </Avatar>
      <span className={cn("truncate text-xs text-[var(--color-text-secondary)]", textClassName)}>{name}</span>
    </span>
  );
}
