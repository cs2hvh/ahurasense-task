"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type CurrentUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  createdAt: string;
};

type ApiResponse<T> = {
  data: T;
  error?: string;
};

export function ProfileSettingsForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await fetch("/api/users/me");
        if (!response.ok) {
          throw new Error("Failed to load profile settings");
        }
        const payload = (await response.json()) as ApiResponse<CurrentUser>;
        setUser(payload.data);
        setFirstName(payload.data.firstName);
        setLastName(payload.data.lastName);
        setEmail(payload.data.email);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load profile settings");
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
        }),
      });
      const payload = (await response.json()) as ApiResponse<CurrentUser>;
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to update profile");
      }

      setUser(payload.data);
      toast.success("Profile settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-6">
      <h2 className="text-[20px] font-semibold text-[var(--color-text-primary)]">Account Information</h2>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Manage your name and login email.</p>

      <form className="mt-4 space-y-3" onSubmit={saveProfile}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="grid gap-1">
            <label className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">First Name</label>
            <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} disabled={loading || saving} />
          </div>
          <div className="grid gap-1">
            <label className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Last Name</label>
            <Input value={lastName} onChange={(event) => setLastName(event.target.value)} disabled={loading || saving} />
          </div>
        </div>

        <div className="grid gap-1">
          <label className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Email</label>
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={loading || saving} />
        </div>

        <div className="grid grid-cols-1 gap-2 text-xs md:grid-cols-3">
          <p className="border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-[var(--color-text-secondary)]">
            Role: <span className="text-[var(--color-text-primary)]">{user?.role ?? "-"}</span>
          </p>
          <p className="border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-[var(--color-text-secondary)]">
            Status: <span className="text-[var(--color-text-primary)]">{user?.status ?? "-"}</span>
          </p>
          <p className="border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-[var(--color-text-secondary)]">
            Joined:{" "}
            <span className="text-[var(--color-text-primary)]">
              {user ? new Date(user.createdAt).toLocaleDateString() : "-"}
            </span>
          </p>
        </div>

        <Button type="submit" size="sm" disabled={loading || saving}>
          {saving ? "Saving..." : "Save Profile"}
        </Button>
      </form>
    </Card>
  );
}
