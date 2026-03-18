"use client";

import { FileText, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface DocumentViewerProps {
  documentId: string;
  title: string;
}

export function DocumentViewer({ documentId, title }: DocumentViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const renderDocument = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${documentId}/content`);
      if (!response.ok) throw new Error("Failed to load document");

      const arrayBuffer = await response.arrayBuffer();
      const container = containerRef.current;
      if (!container) return;

      container.innerHTML = "";

      // Use docx-preview to render the .docx file faithfully
      const docxPreview = await import("docx-preview");
      await docxPreview.renderAsync(arrayBuffer, container, undefined, {
        className: "docx-preview-wrapper",
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        ignoreFonts: false,
        breakPages: true,
        ignoreLastRenderedPageBreak: true,
        experimental: false,
        trimXmlDeclaration: true,
        useBase64URL: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to render document");
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    void renderDocument();
  }, [renderDocument]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2">
        <FileText className="size-4 text-blue-400" />
        <span className="text-sm font-medium text-[var(--color-text-primary)]">{title}</span>
        <span className="text-xs text-[var(--color-text-tertiary)]">View Only</span>
      </div>

      {loading && (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-[var(--color-text-tertiary)]" />
          <span className="ml-2 text-sm text-[var(--color-text-secondary)]">Loading document...</span>
        </div>
      )}

      {error && (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-[var(--color-error)]">{error}</p>
        </div>
      )}

      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-gray-100 p-4"
        style={{ display: loading || error ? "none" : "block" }}
      />
    </div>
  );
}
