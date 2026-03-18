"use client";

import {
  Bold,
  Code,
  Heading2,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  Loader2,
  Strikethrough,
  Underline as UnderlineIcon,
} from "lucide-react";
import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TipTapUnderline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";

import { Button } from "@/components/ui/button";

export function IssueCommentForm({ issueId }: { issueId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      TipTapUnderline,
      Highlight,
      Placeholder.configure({
        placeholder: "Write a comment... Use the toolbar for formatting",
      }),
    ],
    editorProps: {
      attributes: {
        class: "comment-editor-content",
      },
    },
  });

  async function submitComment(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!editor) return;

    const html = editor.getHTML();
    const text = editor.getText().trim();

    if (!text) {
      setError("Comment cannot be empty");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/issues/${issueId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: html }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Failed to add comment");
      }

      editor.commands.clearContent();
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add comment");
    } finally {
      setLoading(false);
    }
  }

  if (!editor) return null;

  const btnCls = (active: boolean) =>
    `inline-flex size-7 items-center justify-center transition-colors ${
      active
        ? "bg-[var(--color-accent-primary)] text-white"
        : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
    }`;

  return (
    <form onSubmit={submitComment}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border border-b-0 border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-1.5 py-1">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btnCls(editor.isActive("bold"))} title="Bold">
          <Bold className="size-3.5" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btnCls(editor.isActive("italic"))} title="Italic">
          <Italic className="size-3.5" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={btnCls(editor.isActive("underline"))} title="Underline">
          <UnderlineIcon className="size-3.5" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={btnCls(editor.isActive("strike"))} title="Strikethrough">
          <Strikethrough className="size-3.5" />
        </button>

        <div className="mx-1 h-4 w-px bg-[var(--color-border)]" />

        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btnCls(editor.isActive("heading", { level: 2 }))} title="Heading">
          <Heading2 className="size-3.5" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHighlight().run()} className={btnCls(editor.isActive("highlight"))} title="Highlight">
          <Highlighter className="size-3.5" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleCode().run()} className={btnCls(editor.isActive("code"))} title="Inline Code">
          <Code className="size-3.5" />
        </button>

        <div className="mx-1 h-4 w-px bg-[var(--color-border)]" />

        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnCls(editor.isActive("bulletList"))} title="Bullet List">
          <List className="size-3.5" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btnCls(editor.isActive("orderedList"))} title="Ordered List">
          <ListOrdered className="size-3.5" />
        </button>
      </div>

      {/* Editor */}
      <div className="comment-editor-wrapper border border-[var(--color-border)] bg-[var(--color-bg-primary)]">
        <EditorContent editor={editor} />
      </div>

      {error ? <p className="mt-1 text-xs text-[var(--color-error)]">{error}</p> : null}

      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-[var(--color-text-tertiary)]">Supports rich text formatting</span>
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-1 size-3.5 animate-spin" />
              Posting...
            </>
          ) : (
            "Add Comment"
          )}
        </Button>
      </div>
    </form>
  );
}


