"use client";

import { Download, Loader2, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

interface PdfViewerProps {
  documentId: string;
  title: string;
}

export function PdfViewer({ documentId, title }: PdfViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);

  const loadPdf = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${documentId}/content`);
      if (!response.ok) throw new Error("Failed to load PDF");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setObjectUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load PDF");
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    void loadPdf();
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadPdf]);

  function handleDownload() {
    if (!objectUrl) return;
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = `${title}.pdf`;
    a.click();
  }

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
        <button type="button" onClick={() => void loadPdf()} className="text-sm text-[var(--color-accent-primary)] hover:underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => setZoom((z) => Math.max(25, z - 25))}>
          <ZoomOut className="size-3.5" />
        </Button>
        <span className="min-w-[3rem] text-center text-xs text-[var(--color-text-secondary)]">{zoom}%</span>
        <Button type="button" variant="secondary" size="sm" onClick={() => setZoom((z) => Math.min(300, z + 25))}>
          <ZoomIn className="size-3.5" />
        </Button>
        <div className="flex-1" />
        <Button type="button" variant="secondary" size="sm" onClick={handleDownload}>
          <Download className="mr-1.5 size-3.5" /> Download
        </Button>
        <span className="ml-2 text-xs text-[var(--color-text-tertiary)]">Read Only</span>
      </div>

      {/* PDF embed */}
      <div className="min-h-0 flex-1 overflow-auto bg-[var(--color-bg-tertiary)]">
        {objectUrl && (
          <div className="flex justify-center p-4" style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}>
            <iframe
              src={`${objectUrl}#toolbar=0`}
              className="h-[calc(100vh-120px)] w-full max-w-4xl rounded border border-[var(--color-border)] bg-white"
              title={title}
            />
          </div>
        )}
      </div>
    </div>
  );
}
