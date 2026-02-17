"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  dismissible?: boolean;
  showCloseButton?: boolean;
}

export function Modal({ open, onOpenChange, title, children, dismissible = true, showCloseButton = true }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 data-[state=closed]:animate-[fadeOut_200ms_ease-in] data-[state=open]:animate-[fadeIn_200ms_ease-out]" />
        <Dialog.Content
          onPointerDownOutside={(event) => {
            if (!dismissible) {
              event.preventDefault();
            }
          }}
          onEscapeKeyDown={(event) => {
            if (!dismissible) {
              event.preventDefault();
            }
          }}
          className={cn(
            "fixed left-1/2 top-1/2 w-[min(1000px,90vw)] max-h-[90vh] -translate-x-1/2 -translate-y-1/2 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5 shadow-[var(--shadow-lg)]",
            "data-[state=closed]:animate-[modalOut_200ms_ease-in] data-[state=open]:animate-[modalIn_200ms_ease-out]",
          )}
        >
          <div className="mb-4 flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <Dialog.Title className="text-lg font-bold text-[var(--color-text-primary)]">{title}</Dialog.Title>
            {showCloseButton ? (
              <Dialog.Close className="rounded-none border border-[var(--color-border)] p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]">
                <X className="size-4" />
              </Dialog.Close>
            ) : null}
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}


