"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

interface CreateStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: { name: string; category: "todo" | "in_progress" | "done"; color?: string }) => Promise<void>;
  loading: boolean;
}

export function CreateStatusDialog({ open, onOpenChange, onCreate, loading }: CreateStatusDialogProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"todo" | "in_progress" | "done">("todo");
  const [color, setColor] = useState("#6B6B73");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    await onCreate({ name: name.trim(), category, color });
    setName("");
    setCategory("todo");
    setColor("#6B6B73");
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Add Board Column">
      <form className="space-y-3" onSubmit={handleSubmit}>
        <div className="grid gap-1">
          <label className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Column Name</label>
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="In QA" />
        </div>

        <div className="grid gap-1">
          <label className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Category</label>
          <select className="h-10 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3" value={category} onChange={(event) => setCategory(event.target.value as "todo" | "in_progress" | "done")}>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>

        <div className="grid gap-1">
          <label className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Color</label>
          <input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-10 w-full border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2" />
        </div>

        {error ? <p className="text-xs text-[var(--color-error)]">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Adding..." : "Add Column"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}


