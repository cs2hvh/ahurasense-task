"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

interface DeleteProjectCardProps {
  projectId: string;
  projectName: string;
  workspaceSlug: string;
}

export function DeleteProjectCard({ projectId, projectName, workspaceSlug }: DeleteProjectCardProps) {
  const router = useRouter();
  const [step, setStep] = useState<0 | 1 | 2>(0); // 0=closed, 1=first confirm, 2=type name
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (confirmText !== projectName) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to delete project");
      }
      toast.success("Project deleted");
      router.push(`/w/${workspaceSlug}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete project");
      setDeleting(false);
    }
  }

  function handleClose() {
    setStep(0);
    setConfirmText("");
  }

  return (
    <>
      <div className="rounded-lg border border-[var(--color-error)]/30 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-error)]">Danger Zone</h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Permanently delete this project and all of its data including issues, sprints, documents, and labels. This action cannot be undone.
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-4 border-[var(--color-error)]/40 text-[var(--color-error)] hover:bg-[var(--color-error)]/10"
          onClick={() => setStep(1)}
        >
          <Trash2 className="mr-1.5 size-3.5" /> Delete Project
        </Button>
      </div>

      {/* Step 1: First confirmation */}
      <Modal open={step === 1} onOpenChange={(open) => { if (!open) handleClose(); }} title="Delete Project?">
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Are you sure you want to delete <span className="font-semibold text-[var(--color-text-primary)]">{projectName}</span>?
          </p>
          <p className="text-sm text-[var(--color-text-secondary)]">
            This will permanently remove all issues, sprints, board data, documents, labels, and member associations. This action <span className="font-semibold text-[var(--color-error)]">cannot be undone</span>.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-[var(--color-error)] text-white hover:bg-[var(--color-error)]/90"
              onClick={() => setStep(2)}
            >
              Yes, I want to delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Step 2: Type project name to confirm */}
      <Modal open={step === 2} onOpenChange={(open) => { if (!open) handleClose(); }} title="Final Confirmation">
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            To confirm, type the project name <span className="font-semibold text-[var(--color-text-primary)]">{projectName}</span> below:
          </p>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={projectName}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-[var(--color-error)] text-white hover:bg-[var(--color-error)]/90"
              disabled={confirmText !== projectName || deleting}
              onClick={() => void handleDelete()}
            >
              {deleting ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Trash2 className="mr-1.5 size-3.5" />}
              {deleting ? "Deleting..." : "Delete Project Permanently"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
