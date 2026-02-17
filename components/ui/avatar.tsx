"use client";

import * as AvatarPrimitive from "@radix-ui/react-avatar";

import { cn } from "@/lib/utils";

export function Avatar({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return <AvatarPrimitive.Root className={cn("relative inline-flex size-8 overflow-hidden border border-[var(--color-border)]", className)} {...props} />;
}

export function AvatarImage({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return <AvatarPrimitive.Image className={cn("h-full w-full object-cover", className)} {...props} />;
}

export function AvatarFallback({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      className={cn("flex h-full w-full items-center justify-center bg-[var(--color-bg-tertiary)] text-xs font-semibold text-[var(--color-text-secondary)]", className)}
      {...props}
    />
  );
}


