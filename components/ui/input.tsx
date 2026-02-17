import { type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-tertiary)] transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] focus:border-[var(--color-accent-primary)] focus:border-2",
        className,
      )}
      {...props}
    />
  );
}


