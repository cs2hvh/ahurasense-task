"use client";

import { UploadCloud } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type CurrentUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: string;
};

type ApiResponse<T> = {
  data: T;
  error?: string;
};

export function AvatarUploadCard() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch("/api/users/me");
        if (!response.ok) {
          throw new Error("Failed to load profile");
        }
        const payload = (await response.json()) as ApiResponse<CurrentUser>;
        setUser(payload.data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  const initials = useMemo(() => {
    if (!user) {
      return "U";
    }
    const raw = `${user.firstName}${user.lastName}`.trim();
    return raw.slice(0, 2).toUpperCase() || "U";
  }, [user]);

  async function uploadAvatar(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch("/api/uploads/avatar", {
        method: "POST",
        body: formData,
      });

      const uploadPayload = (await uploadResponse.json()) as ApiResponse<{
        id: string;
        avatarUrl: string | null;
      }>;

      if (!uploadResponse.ok) {
        throw new Error(uploadPayload.error ?? "Failed to upload avatar");
      }

      setUser((current) =>
        current
          ? {
              ...current,
              avatarUrl: uploadPayload.data.avatarUrl,
            }
          : current,
      );

      window.dispatchEvent(
        new CustomEvent("kanban:avatar-updated", {
          detail: { avatarUrl: uploadPayload.data.avatarUrl },
        }),
      );

      toast.success("Avatar updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload avatar");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function openFilePicker() {
    if (uploading || loading) {
      return;
    }
    fileInputRef.current?.click();
  }

  return (
    <Card className="p-6">
      <h2 className="text-[20px] font-semibold text-[var(--color-text-primary)]">Avatar</h2>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Upload avatar image to DigitalOcean Spaces.</p>

      <div className="mt-4 grid gap-4 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
        <Avatar className="size-20 border border-[var(--color-border)]">
          <AvatarImage src={user?.avatarUrl ?? undefined} alt={user ? `${user.firstName} ${user.lastName}` : "User"} />
          <AvatarFallback className="text-base">{initials}</AvatarFallback>
        </Avatar>

        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void uploadAvatar(file);
              }
            }}
            disabled={uploading || loading}
            className="hidden"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={uploading || loading}
            className="cursor-pointer"
            onClick={openFilePicker}
          >
            <UploadCloud className="mr-1 size-4" />
            {uploading ? "Uploading..." : "Upload Avatar"}
          </Button>
          <p className="text-xs text-[var(--color-text-tertiary)]">PNG/JPG/WebP/GIF/SVG up to 5MB.</p>
          <p className="text-xs text-[var(--color-text-tertiary)]">
            Avatar updates reflect on boards, comments, and assignee selectors.
          </p>
        </div>
      </div>
    </Card>
  );
}
