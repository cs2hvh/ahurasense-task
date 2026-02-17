"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SprintCreateForm({ projectId }: { projectId: string }) {
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createSprint(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/sprints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          goal,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Failed to create sprint");
      }

      setName("");
      setGoal("");
      setStartDate("");
      setEndDate("");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create sprint");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="grid gap-3 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 md:grid-cols-5" onSubmit={createSprint}>
      <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Sprint 15" className="md:col-span-1" />
      <Input value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="Sprint goal" className="md:col-span-2" />
      <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="md:col-span-1" />
      <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="md:col-span-1" />
      <div className="md:col-span-5 flex items-center gap-2">
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "Creating..." : "Create Sprint"}
        </Button>
        {error ? <p className="text-xs text-[var(--color-error)]">{error}</p> : null}
      </div>
    </form>
  );
}


