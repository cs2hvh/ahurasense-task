"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export function IssueCommentForm({ issueId }: { issueId: string }) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitComment(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!content.trim()) {
      setError("Comment cannot be empty");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/issues/${issueId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Failed to add comment");
      }

      setContent("");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add comment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-2" onSubmit={submitComment}>
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        rows={4}
        className="w-full border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3 text-sm outline-none focus:border-[var(--color-accent-primary)]"
        placeholder="Add a comment"
      />
      {error ? <p className="text-xs text-[var(--color-error)]">{error}</p> : null}
      <Button type="submit" size="sm" disabled={loading}>
        {loading ? "Posting..." : "Add Comment"}
      </Button>
    </form>
  );
}


