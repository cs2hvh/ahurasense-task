"use client";

import { Download, Loader2, Save, WrapText } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface TextFileEditorProps {
  documentId: string;
  title: string;
  mimeType: string;
  readOnly?: boolean;
}

function getLanguageLabel(mimeType: string): string {
  const map: Record<string, string> = {
    "text/plain": "Plain Text",
    "text/markdown": "Markdown",
    "text/csv": "CSV",
    "text/html": "HTML",
    "text/css": "CSS",
    "text/javascript": "JavaScript",
    "application/json": "JSON",
    "application/xml": "XML",
    "text/xml": "XML",
  };
  return map[mimeType] ?? "Text";
}

function getFileExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "text/plain": ".txt",
    "text/markdown": ".md",
    "text/csv": ".csv",
    "text/html": ".html",
    "text/css": ".css",
    "text/javascript": ".js",
    "application/json": ".json",
    "application/xml": ".xml",
    "text/xml": ".xml",
  };
  return map[mimeType] ?? ".txt";
}

export function TextFileEditor({ documentId, title, mimeType, readOnly = false }: TextFileEditorProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [wordWrap, setWordWrap] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadFile = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${documentId}/content`);
      if (!response.ok) throw new Error("Failed to load file");

      const text = await response.text();
      setContent(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load file");
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    void loadFile();
  }, [loadFile]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/save-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to save");
      }
      toast.success("File saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function handleDownload() {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}${getFileExtension(mimeType)}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Tab" && !readOnly) {
      e.preventDefault();
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newContent = content.substring(0, start) + "  " + content.substring(end);
      setContent(newContent);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      if (!readOnly) void handleSave();
    }
  }

  const lineCount = content.split("\n").length;
  const charCount = content.length;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-[var(--color-text-tertiary)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <p className="text-sm text-[var(--color-error)]">{error}</p>
        <button type="button" onClick={() => void loadFile()} className="text-sm text-[var(--color-accent-primary)] hover:underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2">
        {!readOnly && (
          <Button type="button" variant="secondary" size="sm" onClick={() => void handleSave()} disabled={saving}>
            {saving ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Save className="mr-1.5 size-3.5" />}
            {saving ? "Saving..." : "Save"}
          </Button>
        )}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setWordWrap((w) => !w)}
          title="Toggle word wrap"
          className={wordWrap ? "bg-[var(--color-bg-tertiary)]" : ""}
        >
          <WrapText className="mr-1 size-3.5" /> Wrap
        </Button>
        <div className="flex-1" />
        <Button type="button" variant="secondary" size="sm" onClick={handleDownload}>
          <Download className="mr-1.5 size-3.5" /> Download
        </Button>
        {readOnly && (
          <span className="ml-2 text-xs text-[var(--color-text-tertiary)]">Read Only</span>
        )}
      </div>

      {/* Editor */}
      <div className="min-h-0 flex-1 overflow-auto bg-[var(--color-bg-primary)]">
        <div className="flex h-full">
          {/* Line numbers */}
          <div className="shrink-0 select-none border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-3 text-right">
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i} className="text-[12px] leading-[20px] text-[var(--color-text-tertiary)]">
                {i + 1}
              </div>
            ))}
          </div>

          {/* Text area */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            readOnly={readOnly}
            spellCheck={false}
            className={`min-h-full flex-1 resize-none border-none bg-transparent p-3 font-mono text-[13px] leading-[20px] text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-tertiary)] ${
              wordWrap ? "whitespace-pre-wrap break-words" : "whitespace-pre overflow-x-auto"
            } ${readOnly ? "cursor-default" : ""}`}
            placeholder={readOnly ? "" : "Start typing..."}
          />
        </div>
      </div>

      {/* Status bar */}
      <div className="flex shrink-0 items-center gap-4 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-1.5">
        <span className="text-[11px] text-[var(--color-text-tertiary)]">
          {getLanguageLabel(mimeType)}
        </span>
        <span className="text-[11px] text-[var(--color-text-tertiary)]">
          {lineCount} {lineCount === 1 ? "line" : "lines"}
        </span>
        <span className="text-[11px] text-[var(--color-text-tertiary)]">
          {charCount.toLocaleString()} chars
        </span>
      </div>
    </div>
  );
}
