"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface ProjectGeneralSettingsFormProps {
  projectId: string;
  canEdit?: boolean;
  initial: {
    key: string;
    name: string;
    description: string | null;
    type: "software" | "business" | "service_desk";
    status: "active" | "archived" | "on_hold";
    startDate: string | null;
    targetEndDate: string | null;
    leadId: string | null;
  };
  members: Array<{ id: string; name: string }>;
}

type ApiResponse<T> = {
  data: T;
  error?: string;
};

export function ProjectGeneralSettingsForm({ projectId, initial, members, canEdit = true }: ProjectGeneralSettingsFormProps) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description ?? "");
  const [type, setType] = useState(initial.type);
  const [status, setStatus] = useState(initial.status);
  const [startDate, setStartDate] = useState(initial.startDate ?? "");
  const [targetEndDate, setTargetEndDate] = useState(initial.targetEndDate ?? "");
  const [leadId, setLeadId] = useState(initial.leadId ?? "");
  const [saving, setSaving] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!canEdit) {
      toast.error("You do not have permission to edit project settings");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          type,
          status,
          startDate: startDate || null,
          targetEndDate: targetEndDate || null,
          leadId: leadId || null,
        }),
      });
      const payload = (await response.json()) as ApiResponse<{ id: string }>;
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to update project");
      }

      toast.success("Project settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update project");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-6">
      <h2 className="text-[20px] font-semibold text-[var(--color-text-primary)]">General Settings</h2>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Configure project profile, lifecycle, and ownership.</p>
      {!canEdit ? (
        <p className="mt-2 text-xs text-[var(--color-warning)]">
          You have read-only access. Contact a project lead or workspace admin to update settings.
        </p>
      ) : null}

      <form className="mt-4 space-y-3" onSubmit={save}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="grid gap-1">
            <label className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Project Key</label>
            <Input value={initial.key} disabled />
          </div>
          <div className="grid gap-1">
            <label className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Project Name</label>
            <Input value={name} onChange={(event) => setName(event.target.value)} disabled={saving || !canEdit} />
          </div>
        </div>

        <div className="grid gap-1">
          <label className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Description</label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            disabled={saving || !canEdit}
            className="w-full border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3 text-sm outline-none focus:border-[var(--color-accent-primary)]"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="grid gap-1">
            <label className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Type</label>
            <select value={type} onChange={(event) => setType(event.target.value as typeof type)} disabled={saving || !canEdit} className="h-10 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3">
              <option value="software">Software</option>
              <option value="business">Business</option>
              <option value="service_desk">Service Desk</option>
            </select>
          </div>
          <div className="grid gap-1">
            <label className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Status</label>
            <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} disabled={saving || !canEdit} className="h-10 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3">
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="grid gap-1">
            <label className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Project Lead</label>
            <select value={leadId} onChange={(event) => setLeadId(event.target.value)} disabled={saving || !canEdit} className="h-10 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3">
              <option value="">No lead</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="grid gap-1">
            <label className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Start Date</label>
            <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} disabled={saving || !canEdit} />
          </div>
          <div className="grid gap-1">
            <label className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Target End Date</label>
            <Input type="date" value={targetEndDate} onChange={(event) => setTargetEndDate(event.target.value)} disabled={saving || !canEdit} />
          </div>
        </div>

        <Button type="submit" size="sm" disabled={saving || !canEdit}>
          {saving ? "Saving..." : "Save Project"}
        </Button>
      </form>
    </Card>
  );
}
