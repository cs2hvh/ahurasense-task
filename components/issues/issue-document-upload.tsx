"use client";

import { FileText, Loader2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRef, useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface IssueDocument {
  id: string;
  title: string;
  fileSize: number;
  mimeType: string;
  updatedAt: string;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
  _count: { versions: number };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function IssueDocumentUpload({
  issueId,
  basePath,
}: {
  issueId: string;
  basePath: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<IssueDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch(`/api/issues/${issueId}/documents`);
      const data = await res.json();
      if (res.ok) setDocuments(data.data);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [issueId]);

  useEffect(() => {
    void fetchDocuments();
  }, [fetchDocuments]);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/issues/${issueId}/documents`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to upload");
      }

      toast.success("Document uploaded to issue");
      void fetchDocuments();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(docId: string) {
    setDeletingId(docId);
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete document");
      toast.success("Document removed");
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <input
          ref={fileInputRef}
          type="file"
          accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleUpload(file);
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="text-xs"
        >
          {uploading ? <Loader2 className="mr-1 size-3 animate-spin" /> : <Plus className="mr-1 size-3" />}
          {uploading ? "Uploading..." : "Upload Doc"}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-2">
          <Loader2 className="size-4 animate-spin text-[var(--color-text-tertiary)]" />
        </div>
      ) : (
        <div className="space-y-2 text-xs">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-2 border border-[var(--color-border)] p-2 transition-colors hover:bg-[var(--color-bg-tertiary)]"
            >
              <FileText className="size-4 shrink-0 text-blue-400" />
              <Link
                href={`${basePath}/documents/${doc.id}`}
                className="min-w-0 flex-1 truncate text-[var(--color-accent-primary)] hover:text-[var(--color-accent-hover)]"
              >
                {doc.title}
              </Link>
              <span className="shrink-0 text-[var(--color-text-tertiary)]">{formatFileSize(doc.fileSize)}</span>
              <button
                type="button"
                onClick={() => void handleDelete(doc.id)}
                disabled={deletingId === doc.id}
                className="shrink-0 text-[var(--color-text-tertiary)] hover:text-[var(--color-error)]"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
          {documents.length === 0 && (
            <p className="text-[var(--color-text-secondary)]">No documents linked.</p>
          )}
        </div>
      )}
    </div>
  );
}
