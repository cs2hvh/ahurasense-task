"use client";

import {
  Download,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";

interface SpreadsheetEditorProps {
  documentId: string;
  title: string;
  readOnly?: boolean;
}

interface SheetData {
  name: string;
  data: (string | number | null)[][];
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

export function SpreadsheetEditor({ documentId, title, readOnly = false }: SpreadsheetEditorProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheets, setSheets] = useState<SheetData[]>([{ name: "Sheet1", data: Array.from({ length: 20 }, () => Array(10).fill(null)) }]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [editingCell, setEditingCell] = useState<{ r: number; c: number } | null>(null);
  const [selection, setSelection] = useState<{ r: number; c: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
        if (!ref) {
          return { name, data: Array.from({ length: 20 }, () => Array(10).fill(null)) };
        }

        const range = XLSX.utils.decode_range(ref);
        // Minimum grid size
        const rowCount = Math.max(range.e.r + 1, 20);
        const colCount = Math.max(range.e.c + 1, 10);

        const data: (string | number | null)[][] = [];
        for (let r = 0; r < rowCount; r++) {
          const row: (string | number | null)[] = [];
          for (let c = 0; c < colCount; c++) {
            const addr = XLSX.utils.encode_cell({ r, c });
            const cell = sheet[addr];
            if (cell) {
              row.push(cell.v ?? null);
            } else {
              row.push(null);
            }
          }
          data.push(row);
        }

        return { name, data };
      });

      if (parsed.length === 0) {
        parsed.push({ name: "Sheet1", data: Array.from({ length: 20 }, () => Array(10).fill(null)) });
      }

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

  function updateCell(sheetIdx: number, r: number, c: number, value: string) {
    setSheets((prev) => {
      const updated = [...prev];
      const sheet = { ...updated[sheetIdx], data: updated[sheetIdx].data.map((row) => [...row]) };
      // Auto-convert numbers
      const num = Number(value);
      sheet.data[r][c] = value === "" ? null : !isNaN(num) && value.trim() !== "" ? num : value;
      updated[sheetIdx] = sheet;
      return updated;
    });
  }

  function addRow() {
    setSheets((prev) => {
      const updated = [...prev];
      const sheet = updated[activeSheet];
      const colCount = sheet.data[0]?.length ?? 10;
      updated[activeSheet] = { ...sheet, data: [...sheet.data, Array(colCount).fill(null)] };
      return updated;
    });
  }

  function addColumn() {
    setSheets((prev) => {
      const updated = [...prev];
      const sheet = updated[activeSheet];
      updated[activeSheet] = {
        ...sheet,
        data: sheet.data.map((row) => [...row, null]),
      };
      return updated;
    });
  }

  function deleteRow(rowIdx: number) {
    setSheets((prev) => {
      const updated = [...prev];
      const sheet = updated[activeSheet];
      if (sheet.data.length <= 1) return prev;
      updated[activeSheet] = { ...sheet, data: sheet.data.filter((_, i) => i !== rowIdx) };
      return updated;
    });
    setEditingCell(null);
    setSelection(null);
  }

  function deleteColumn(colIdx: number) {
    setSheets((prev) => {
      const updated = [...prev];
      const sheet = updated[activeSheet];
      if ((sheet.data[0]?.length ?? 0) <= 1) return prev;
      updated[activeSheet] = {
        ...sheet,
        data: sheet.data.map((row) => row.filter((_, i) => i !== colIdx)),
      };
      return updated;
    });
    setEditingCell(null);
    setSelection(null);
  }

  function addSheet() {
    const name = `Sheet${sheets.length + 1}`;
    setSheets((prev) => [...prev, { name, data: Array.from({ length: 20 }, () => Array(10).fill(null)) }]);
    setActiveSheet(sheets.length);
  }

  function renameSheet(idx: number) {
    const current = sheets[idx].name;
    const newName = prompt("Sheet name:", current);
    if (newName && newName.trim()) {
      setSheets((prev) => {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], name: newName.trim() };
        return updated;
      });
    }
  }

  function deleteSheet(idx: number) {
    if (sheets.length <= 1) return;
    setSheets((prev) => prev.filter((_, i) => i !== idx));
    if (activeSheet >= sheets.length - 1) setActiveSheet(Math.max(0, sheets.length - 2));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = sheets.map((s) => ({ name: s.name, data: s.data }));
      const res = await fetch(`/api/documents/${documentId}/save-spreadsheet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheets: payload }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to save");
      }
      toast.success("Spreadsheet saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDownload() {
    try {
      const payload = sheets.map((s) => ({ name: s.name, data: s.data }));
      const res = await fetch(`/api/documents/${documentId}/save-spreadsheet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheets: payload, downloadOnly: true }),
      });
      if (!res.ok) throw new Error("Failed to generate download");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to download");
    }
  }

  function handleCellKeyDown(e: React.KeyboardEvent, r: number, c: number) {
    const sheet = sheets[activeSheet];
    if (e.key === "Tab") {
      e.preventDefault();
      const nextC = e.shiftKey ? Math.max(0, c - 1) : Math.min((sheet.data[0]?.length ?? 1) - 1, c + 1);
      setEditingCell({ r, c: nextC });
      setSelection({ r, c: nextC });
    } else if (e.key === "Enter") {
      e.preventDefault();
      const nextR = e.shiftKey ? Math.max(0, r - 1) : Math.min(sheet.data.length - 1, r + 1);
      setEditingCell(null);
      setSelection({ r: nextR, c });
    } else if (e.key === "Escape") {
      setEditingCell(null);
    }
  }

  function handleCellClick(r: number, c: number) {
    setSelection({ r, c });
    if (!readOnly) {
      setEditingCell({ r, c });
    }
  }

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingCell]);

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
        <button type="button" onClick={() => void loadSpreadsheet()} className="text-sm text-[var(--color-accent-primary)] hover:underline">
          Retry
        </button>
      </div>
    );
  }

  const sheet = sheets[activeSheet];
  const colCount = sheet.data[0]?.length ?? 0;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2">
        {!readOnly && (
          <>
            <Button type="button" variant="secondary" size="sm" onClick={() => void handleSave()} disabled={saving}>
              {saving ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Save className="mr-1.5 size-3.5" />}
              {saving ? "Saving..." : "Save"}
            </Button>
            <div className="mx-1 h-5 w-px bg-[var(--color-border)]" />
            <Button type="button" variant="secondary" size="sm" onClick={addRow} title="Add row">
              <Plus className="mr-1 size-3.5" /> Row
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={addColumn} title="Add column">
              <Plus className="mr-1 size-3.5" /> Column
            </Button>
            {selection && (
              <>
                <div className="mx-1 h-5 w-px bg-[var(--color-border)]" />
                <Button type="button" variant="secondary" size="sm" onClick={() => deleteRow(selection.r)} title="Delete selected row">
                  <Trash2 className="mr-1 size-3.5" /> Row {selection.r + 1}
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => deleteColumn(selection.c)} title="Delete selected column">
                  <Trash2 className="mr-1 size-3.5" /> Col {colLabel(selection.c)}
                </Button>
              </>
            )}
          </>
        )}
        <div className="flex-1" />
        <Button type="button" variant="secondary" size="sm" onClick={() => void handleDownload()}>
          <Download className="mr-1.5 size-3.5" /> Download
        </Button>
        {readOnly && (
          <span className="ml-2 text-xs text-[var(--color-text-tertiary)]">Read Only</span>
        )}
      </div>

      {/* Formula / cell ref bar */}
      {selection && (
        <div className="flex shrink-0 items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-bg-primary)] px-4 py-1">
          <span className="w-12 text-center text-xs font-medium text-[var(--color-text-tertiary)]">
            {colLabel(selection.c)}{selection.r + 1}
          </span>
          <div className="h-4 w-px bg-[var(--color-border)]" />
          <span className="text-xs text-[var(--color-text-secondary)]">
            {sheet.data[selection.r]?.[selection.c] != null ? String(sheet.data[selection.r][selection.c]) : ""}
          </span>
        </div>
      )}

      {/* Spreadsheet grid */}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[var(--color-bg-secondary)]">
              <th className="sticky left-0 z-20 w-12 border-b border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2 py-1.5 text-center text-[11px] font-medium text-[var(--color-text-tertiary)]" />
              {Array.from({ length: colCount }, (_, i) => (
                <th
                  key={i}
                  className="min-w-[90px] border-b border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-1.5 text-center text-[11px] font-medium text-[var(--color-text-tertiary)]"
                >
                  {colLabel(i)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sheet.data.map((row, ri) => (
              <tr key={ri}>
                <td className="sticky left-0 z-[5] border-b border-r border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-0.5 text-center text-[11px] text-[var(--color-text-tertiary)]">
                  {ri + 1}
                </td>
                {row.map((cell, ci) => {
                  const isEditing = editingCell?.r === ri && editingCell?.c === ci;
                  const isSelected = selection?.r === ri && selection?.c === ci;
                  return (
                    <td
                      key={ci}
                      onClick={() => handleCellClick(ri, ci)}
                      className={`border-b border-r border-[var(--color-border)] px-0 py-0 text-[13px] ${
                        isSelected
                          ? "outline outline-2 outline-[var(--color-accent-primary)]"
                          : ""
                      }`}
                    >
                      {isEditing ? (
                        <input
                          ref={inputRef}
                          type="text"
                          defaultValue={cell != null ? String(cell) : ""}
                          onBlur={(e) => {
                            updateCell(activeSheet, ri, ci, e.target.value);
                            setEditingCell(null);
                          }}
                          onKeyDown={(e) => handleCellKeyDown(e, ri, ci)}
                          className="w-full bg-transparent px-2 py-1 text-[13px] text-[var(--color-text-primary)] outline-none"
                        />
                      ) : (
                        <div className="min-h-[28px] whitespace-nowrap px-2 py-1 text-[var(--color-text-primary)]">
                          {cell != null ? String(cell) : ""}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sheet tabs */}
      <div className="flex shrink-0 items-center border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
        {sheets.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => { setActiveSheet(i); setEditingCell(null); setSelection(null); }}
            onDoubleClick={() => !readOnly && renameSheet(i)}
            className={`group relative border-r border-[var(--color-border)] px-4 py-2 text-xs transition-colors ${
              i === activeSheet
                ? "bg-[var(--color-bg-primary)] font-medium text-[var(--color-text-primary)]"
                : "text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-secondary)]"
            }`}
          >
            {s.name}
            {!readOnly && sheets.length > 1 && (
              <span
                onClick={(e) => { e.stopPropagation(); deleteSheet(i); }}
                className="ml-2 hidden text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] group-hover:inline"
              >
                ×
              </span>
            )}
          </button>
        ))}
        {!readOnly && (
          <button
            type="button"
            onClick={addSheet}
            className="inline-flex items-center gap-1 px-3 py-2 text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
          >
            <Plus className="size-3" />
          </button>
        )}
      </div>
    </div>
  );
}
