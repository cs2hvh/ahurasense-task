"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LabelItem {
  id: string;
  name: string;
  color: string;
}

export function LabelsManager({ projectId, canManage = false }: { projectId: string; canManage?: boolean }) {
  const [labels, setLabels] = useState<LabelItem[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#0066FF");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadLabels() {
    const response = await fetch(`/api/projects/${projectId}/labels`, { cache: "no-store" });
    const payload = (await response.json()) as { data?: LabelItem[]; error?: string };
    if (response.ok && payload.data) {
      setLabels(payload.data);
      return;
    }

    setError(payload.error ?? "Failed to load labels");
  }

  useEffect(() => {
    void loadLabels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function createLabel(event: React.FormEvent) {
    event.preventDefault();
    if (!canManage) {
      toast.error("You do not have permission to manage labels");
      return;
    }
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/projects/${projectId}/labels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color }),
    });

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Failed to create label");
      setLoading(false);
      return;
    }

    setName("");
    setColor("#0066FF");
    setLoading(false);
    await loadLabels();
  }

  async function deleteLabel(id: string) {
    if (!canManage) {
      toast.error("You do not have permission to manage labels");
      return;
    }
    await fetch(`/api/labels/${id}`, { method: "DELETE" });
    await loadLabels();
  }

  return (
    <div className="space-y-3">
      <form className="grid gap-3 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 md:grid-cols-[1fr_120px_auto]" onSubmit={createLabel}>
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Add label name" disabled={!canManage} />
        <input className="h-10 w-full border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-1 disabled:cursor-not-allowed disabled:opacity-60" type="color" value={color} onChange={(event) => setColor(event.target.value)} disabled={!canManage} />
        <Button type="submit" disabled={loading || !canManage}>
          {loading ? "Adding..." : "Add Label"}
        </Button>
      </form>
      {!canManage ? (
        <p className="text-xs text-[var(--color-warning)]">
          You have read-only access. Only project leads or workspace admins can manage labels.
        </p>
      ) : null}

      {error ? <p className="text-xs text-[var(--color-error)]">{error}</p> : null}

      <div className="space-y-2">
        {labels.map((label) => (
          <div key={label.id} className="flex items-center justify-between border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3" style={{ backgroundColor: label.color }} />
              <span className="text-sm text-[var(--color-text-primary)]">{label.name}</span>
            </div>
            {canManage ? (
              <Button variant="ghost" size="sm" onClick={() => deleteLabel(label.id)}>
                Delete
              </Button>
            ) : null}
          </div>
        ))}

        {!labels.length ? <p className="text-sm text-[var(--color-text-secondary)]">No labels yet.</p> : null}
      </div>
    </div>
  );
}


