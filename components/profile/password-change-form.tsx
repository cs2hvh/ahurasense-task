"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

export function PasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/users/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const payload = (await response.json()) as ApiResponse<{ success: boolean }>;
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to change password");
      }

      setCurrentPassword("");
      setNewPassword("");
      toast.success("Password changed successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to change password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-6">
      <h2 className="text-[20px] font-semibold text-[var(--color-text-primary)]">Security</h2>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Change your password (minimum 12 chars, upper/lower/number).</p>

      <form className="mt-4 space-y-3" onSubmit={changePassword}>
        <div className="grid gap-1">
          <label className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Current Password</label>
          <Input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            disabled={saving}
          />
        </div>

        <div className="grid gap-1">
          <label className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">New Password</label>
          <Input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} disabled={saving} />
        </div>

        <Button type="submit" size="sm" disabled={saving}>
          {saving ? "Updating..." : "Change Password"}
        </Button>
      </form>

      <div className="mt-4 border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3 text-xs text-[var(--color-text-secondary)]">
        Password policy: minimum 12 characters with at least one uppercase letter, one lowercase letter, and one number.
      </div>
    </Card>
  );
}
