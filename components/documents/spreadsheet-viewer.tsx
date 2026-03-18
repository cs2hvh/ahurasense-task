"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import * as XLSX from "xlsx";

interface SpreadsheetViewerProps {
  documentId: string;
  title: string;
}

interface SheetData {
  name: string;
  headers: string[];
  rows: (string | number | boolean | null)[][];
  merges: XLSX.Range[];
}

function colLabel(index: number): string {
  let label = "";
  let n = index;
  while (n >= 0) {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  }
  return label;
}

export function SpreadsheetViewer({ documentId, title }: SpreadsheetViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);

  const loadSpreadsheet = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${documentId}/content`);
      if (!response.ok) throw new Error("Failed to load spreadsheet");

      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });

      const parsed: SheetData[] = workbook.SheetNames.map((name) => {
        const sheet = workbook.Sheets[name];
        const ref = sheet["!ref"];
        if (!ref) return { name, headers: [], rows: [], merges: [] };

        const range = XLSX.utils.decode_range(ref);
        const colCount = range.e.c - range.s.c + 1;

        const headers = Array.from({ length: colCount }, (_, i) => colLabel(range.s.c + i));

        const rows: (string | number | boolean | null)[][] = [];
        for (let r = range.s.r; r <= range.e.r; r++) {
          const row: (string | number | boolean | null)[] = [];
          for (let c = range.s.c; c <= range.e.c; c++) {
            const addr = XLSX.utils.encode_cell({ r, c });
            const cell = sheet[addr];
            row.push(cell ? (cell.w ?? cell.v ?? null) : null);
          }
          rows.push(row);
        }

        return { name, headers, rows, merges: sheet["!merges"] ?? [] };
      });

      setSheets(parsed);
      setActiveSheet(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load spreadsheet");
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    void loadSpreadsheet();
  }, [loadSpreadsheet]);

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
        <button
          type="button"
          onClick={() => void loadSpreadsheet()}
          className="text-sm text-[var(--color-accent-primary)] hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  const sheet = sheets[activeSheet];
  if (!sheet || sheet.rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-[var(--color-text-tertiary)]">This spreadsheet is empty</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Spreadsheet content */}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[var(--color-bg-secondary)]">
              <th className="sticky left-0 z-20 w-12 border-b border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2 py-1.5 text-center text-[11px] font-medium text-[var(--color-text-tertiary)]" />
              {sheet.headers.map((h) => (
                <th
                  key={h}
                  className="min-w-[80px] border-b border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-1.5 text-center text-[11px] font-medium text-[var(--color-text-tertiary)]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sheet.rows.map((row, ri) => (
              <tr key={ri} className="hover:bg-[var(--color-bg-secondary)]">
                <td className="sticky left-0 z-[5] border-b border-r border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-1 text-center text-[11px] text-[var(--color-text-tertiary)]">
                  {ri + 1}
                </td>
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className="whitespace-nowrap border-b border-r border-[var(--color-border)] px-3 py-1 text-[13px] text-[var(--color-text-primary)]"
                  >
                    {cell != null ? String(cell) : ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sheet tabs */}
      {sheets.length > 1 && (
        <div className="flex shrink-0 items-center gap-0 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
          {sheets.map((s, i) => (
            <button
              key={s.name}
              type="button"
              onClick={() => setActiveSheet(i)}
              className={`border-r border-[var(--color-border)] px-4 py-2 text-xs transition-colors ${
                i === activeSheet
                  ? "bg-[var(--color-bg-primary)] font-medium text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-secondary)]"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
