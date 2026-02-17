"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface WorkspaceSettingsFormProps {
  workspaceId: string;
  initial: {
    name: string;
    slug: string;
    description: string | null;
  };
}

type ApiResponse<T> = {
  data: T;
  error?: string;
};

export function WorkspaceSettingsForm({ workspaceId, initial }: WorkspaceSettingsFormProps) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description ?? "");
  const [saving, setSaving] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
        }),
      });
      const payload = (await response.json()) as ApiResponse<{ id: string; name: string; description: string | null }>;
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to update workspace");
      }

      toast.success("Workspace settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update workspace");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-6">
      <h2 className="text-[20px] font-semibold text-[var(--color-text-primary)]">Workspace Settings</h2>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Update workspace name and description.</p>

      <form className="mt-4 space-y-3" onSubmit={save}>
        <div className="grid gap-1">
          <label className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Workspace Name</label>
          <Input value={name} onChange={(event) => setName(event.target.value)} disabled={saving} />
        </div>

        <div className="grid gap-1">
          <label className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Slug</label>
          <Input value={initial.slug} disabled />
        </div>

        <div className="grid gap-1">
          <label className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Description</label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            disabled={saving}
            className="w-full border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3 text-sm outline-none focus:border-[var(--color-accent-primary)]"
          />
        </div>

        <Button type="submit" size="sm" disabled={saving}>
          {saving ? "Saving..." : "Save Workspace"}
        </Button>
      </form>
    </Card>
  );
}

