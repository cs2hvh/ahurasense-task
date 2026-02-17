"use client";

import { Bell, LogOut, Settings, UserCircle2 } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserMenuProps {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
}

export function UserMenu({ name, email, avatarUrl }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center border border-[var(--color-border)] p-1 hover:bg-[var(--color-bg-tertiary)]"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar>
          <AvatarImage src={avatarUrl ?? undefined} alt={name ?? "User"} />
          <AvatarFallback>{name?.slice(0, 2).toUpperCase() ?? "U"}</AvatarFallback>
        </Avatar>
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-30 mt-2 w-64 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-[var(--shadow-lg)]">
          <div className="border-b border-[var(--color-border)] px-3 py-2">
            <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{name ?? "User"}</p>
            <p className="truncate text-xs text-[var(--color-text-tertiary)]">{email ?? "No email"}</p>
          </div>

          <div className="p-1">
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="flex h-9 items-center gap-2 px-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
            >
              <UserCircle2 className="size-4" />
              <span>Profile Settings</span>
            </Link>
            <Link
              href="/profile/notifications"
              onClick={() => setOpen(false)}
              className="flex h-9 items-center gap-2 px-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
            >
              <Settings className="size-4" />
              <span>Notification Settings</span>
            </Link>
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="flex h-9 items-center gap-2 px-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
            >
              <Bell className="size-4" />
              <span>Notification Center</span>
            </Link>
          </div>

          <div className="border-t border-[var(--color-border)] p-1">
            <button
              onClick={() => {
                setOpen(false);
                void signOut({ callbackUrl: "/auth/login" });
              }}
              className="flex h-9 w-full items-center gap-2 px-2 text-left text-sm text-[var(--color-error)] hover:bg-[var(--color-bg-tertiary)]"
            >
              <LogOut className="size-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
