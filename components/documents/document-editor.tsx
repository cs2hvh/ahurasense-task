"use client";

import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Download,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  ListTodo,
  Loader2,
  Minus,
  Quote,
  Redo2,
  RemoveFormatting,
  Save,
  Strikethrough,
  Subscript,
  Superscript,
  Table as TableIcon,
  Type,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TipTapUnderline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import TipTapImage from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import TipTapSubscript from "@tiptap/extension-subscript";
import TipTapSuperscript from "@tiptap/extension-superscript";
import Placeholder from "@tiptap/extension-placeholder";

import { Button } from "@/components/ui/button";

interface DocumentEditorProps {
  documentId: string;
  title: string;
  readOnly?: boolean;
  onSaved?: () => void;
}

export function DocumentEditor({ documentId, title, readOnly, onSaved }: DocumentEditorProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  const editor = useEditor({
    immediatelyRender: false,
    editable: !readOnly,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      TipTapUnderline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      TipTapImage.configure({ allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-[var(--color-accent-primary)] underline cursor-pointer" },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TipTapSubscript,
      TipTapSuperscript,
      Placeholder.configure({ placeholder: "Start writing your document..." }),
    ],
    editorProps: {
      attributes: {
        class: "doc-editor-content",
      },
    },
    onUpdate: ({ editor: ed }) => {
      const text = ed.getText();
      setCharCount(text.length);
      setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
    },
  });

  const loadDocument = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${documentId}/content`);
      if (!response.ok) throw new Error("Failed to load document");

      const arrayBuffer = await response.arrayBuffer();

      const mammoth = await import("mammoth");
      const result = await mammoth.convertToHtml({ arrayBuffer });

      if (editor) {
        editor.commands.setContent(result.value);
        const text = editor.getText();
        setCharCount(text.length);
        setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load document");
    } finally {
      setLoading(false);
    }
  }, [documentId, editor]);

  useEffect(() => {
    if (editor) {
      void loadDocument();
    }
  }, [editor, loadDocument]);

  // Keyboard shortcut: Ctrl+S to save
  useEffect(() => {
    if (readOnly) return;
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        void handleSave();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, readOnly]);

  async function handleSave() {
    if (!editor || readOnly) return;

    setSaving(true);
    try {
      const htmlContent = editor.getHTML();

      const res = await fetch(`/api/documents/${documentId}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: htmlContent }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to save document");
      }

      toast.success("Document saved");
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save document");
    } finally {
      setSaving(false);
    }
  }

  async function handleDownload() {
    if (!editor) return;

    try {
      const htmlContent = editor.getHTML();

      const convertRes = await fetch(`/api/documents/${documentId}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: htmlContent }),
      });

      if (!convertRes.ok) throw new Error("Failed to convert document");

      const docxBlob = await convertRes.blob();
      const { saveAs } = await import("file-saver");
      saveAs(docxBlob, `${title}.docx`);
    } catch {
      toast.error("Failed to download document");
    }
  }

  function insertLink() {
    if (!editor) return;
    const prevUrl = editor.getAttributes("link").href;
    const url = window.prompt("Enter URL:", prevUrl || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  }

  function insertImage() {
    if (!editor) return;
    const url = window.prompt("Enter image URL:");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }

  function setFontColor() {
    if (!editor) return;
    const color = window.prompt("Enter color (hex):", "#000000");
    if (color) {
      editor.chain().focus().setColor(color).run();
    }
  }

  function setHighlightColor() {
    if (!editor) return;
    const color = window.prompt("Highlight color (hex):", "#fef08a");
    if (color) {
      editor.chain().focus().setHighlight({ color }).run();
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-[var(--color-text-tertiary)]" />
        <span className="ml-2 text-sm text-[var(--color-text-secondary)]">Loading editor...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-[var(--color-error)]">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      {!readOnly && (
        <div className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
          {/* Row 1: Main formatting */}
          <div className="flex flex-wrap items-center gap-0.5 px-3 py-1.5">
            {/* Text formatting */}
            <ToolbarGroup label="Format">
              <ToolbarButton onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive("bold")} title="Bold (Ctrl+B)">
                <Bold className="size-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive("italic")} title="Italic (Ctrl+I)">
                <Italic className="size-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive("underline")} title="Underline (Ctrl+U)">
                <UnderlineIcon className="size-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().toggleStrike().run()} active={editor?.isActive("strike")} title="Strikethrough">
                <Strikethrough className="size-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().toggleSubscript().run()} active={editor?.isActive("subscript")} title="Subscript">
                <Subscript className="size-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().toggleSuperscript().run()} active={editor?.isActive("superscript")} title="Superscript">
                <Superscript className="size-4" />
              </ToolbarButton>
            </ToolbarGroup>

            <ToolbarDivider />

            {/* Color & Highlight */}
            <ToolbarGroup label="Color">
              <ToolbarButton onClick={setFontColor} title="Text Color">
                <Type className="size-4" />
              </ToolbarButton>
              <ToolbarButton onClick={setHighlightColor} active={editor?.isActive("highlight")} title="Highlight Color">
                <Highlighter className="size-4" />
              </ToolbarButton>
            </ToolbarGroup>

            <ToolbarDivider />

            {/* Headings */}
            <ToolbarGroup label="Heading">
              <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive("heading", { level: 1 })} title="Heading 1">
                <Heading1 className="size-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive("heading", { level: 2 })} title="Heading 2">
                <Heading2 className="size-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive("heading", { level: 3 })} title="Heading 3">
                <Heading3 className="size-4" />
              </ToolbarButton>
            </ToolbarGroup>

            <ToolbarDivider />

            {/* Lists */}
            <ToolbarGroup label="Lists">
              <ToolbarButton onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive("bulletList")} title="Bullet List">
                <List className="size-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive("orderedList")} title="Numbered List">
                <ListOrdered className="size-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().toggleTaskList().run()} active={editor?.isActive("taskList")} title="Task List">
                <ListTodo className="size-4" />
              </ToolbarButton>
            </ToolbarGroup>

            <ToolbarDivider />

            {/* Alignment */}
            <ToolbarGroup label="Align">
              <ToolbarButton onClick={() => editor?.chain().focus().setTextAlign("left").run()} active={editor?.isActive({ textAlign: "left" })} title="Align Left">
                <AlignLeft className="size-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().setTextAlign("center").run()} active={editor?.isActive({ textAlign: "center" })} title="Align Center">
                <AlignCenter className="size-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().setTextAlign("right").run()} active={editor?.isActive({ textAlign: "right" })} title="Align Right">
                <AlignRight className="size-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().setTextAlign("justify").run()} active={editor?.isActive({ textAlign: "justify" })} title="Justify">
                <AlignJustify className="size-4" />
              </ToolbarButton>
            </ToolbarGroup>

            <ToolbarDivider />

            {/* Insert */}
            <ToolbarGroup label="Insert">
              <ToolbarButton onClick={insertLink} active={editor?.isActive("link")} title="Insert Link">
                <LinkIcon className="size-4" />
              </ToolbarButton>
              <ToolbarButton onClick={insertImage} title="Insert Image">
                <ImageIcon className="size-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive("blockquote")} title="Blockquote">
                <Quote className="size-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().toggleCodeBlock().run()} active={editor?.isActive("codeBlock")} title="Code Block">
                <Code className="size-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
                <Minus className="size-4" />
              </ToolbarButton>
            </ToolbarGroup>

            <ToolbarDivider />

            {/* Table */}
            <ToolbarGroup label="Table">
              <ToolbarButton onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Insert Table">
                <TableIcon className="size-4" />
              </ToolbarButton>
            </ToolbarGroup>

            <ToolbarDivider />

            {/* Utility */}
            <ToolbarGroup label="Utility">
              <ToolbarButton onClick={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()} title="Clear Formatting">
                <RemoveFormatting className="size-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().undo().run()} disabled={!editor?.can().undo()} title="Undo (Ctrl+Z)">
                <Undo2 className="size-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().redo().run()} disabled={!editor?.can().redo()} title="Redo (Ctrl+Y)">
                <Redo2 className="size-4" />
              </ToolbarButton>
            </ToolbarGroup>

            {/* Save / Download */}
            <div className="ml-auto flex items-center gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => void handleDownload()}>
                <Download className="mr-1 size-4" />
                Download
              </Button>
              <Button type="button" size="sm" disabled={saving} onClick={() => void handleSave()}>
                {saving ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Save className="mr-1 size-4" />}
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>

          {/* Table context toolbar - only shows when cursor is in a table */}
          {editor?.isActive("table") && (
            <div className="flex items-center gap-1 border-t border-[var(--color-border)] px-3 py-1 text-xs">
              <span className="mr-1 text-[var(--color-text-tertiary)]">Table:</span>
              <button type="button" onClick={() => editor.chain().focus().addColumnBefore().run()} className="px-2 py-0.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]">
                + Col Before
              </button>
              <button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()} className="px-2 py-0.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]">
                + Col After
              </button>
              <button type="button" onClick={() => editor.chain().focus().addRowBefore().run()} className="px-2 py-0.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]">
                + Row Before
              </button>
              <button type="button" onClick={() => editor.chain().focus().addRowAfter().run()} className="px-2 py-0.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]">
                + Row After
              </button>
              <div className="mx-1 h-3 w-px bg-[var(--color-border)]" />
              <button type="button" onClick={() => editor.chain().focus().deleteColumn().run()} className="px-2 py-0.5 text-[var(--color-error)] hover:bg-[var(--color-bg-tertiary)]">
                Del Col
              </button>
              <button type="button" onClick={() => editor.chain().focus().deleteRow().run()} className="px-2 py-0.5 text-[var(--color-error)] hover:bg-[var(--color-bg-tertiary)]">
                Del Row
              </button>
              <button type="button" onClick={() => editor.chain().focus().deleteTable().run()} className="px-2 py-0.5 text-[var(--color-error)] hover:bg-[var(--color-bg-tertiary)]">
                Del Table
              </button>
              <button type="button" onClick={() => editor.chain().focus().mergeCells().run()} className="px-2 py-0.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]">
                Merge
              </button>
              <button type="button" onClick={() => editor.chain().focus().splitCell().run()} className="px-2 py-0.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]">
                Split
              </button>
            </div>
          )}
        </div>
      )}

      {/* Editor area */}
      <div className="flex-1 overflow-auto bg-gray-100 p-4">
        <div className="mx-auto max-w-[816px] shadow-md">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-1.5 text-xs text-[var(--color-text-tertiary)]">
        <div className="flex items-center gap-4">
          <span>{wordCount} words</span>
          <span>{charCount} characters</span>
        </div>
        <div className="flex items-center gap-3">
          {readOnly && <span className="font-medium text-yellow-500">Read Only</span>}
          {saving && <span>Saving...</span>}
        </div>
      </div>
    </div>
  );
}

function ToolbarGroup({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-0.5" role="group" aria-label={label}>
      {children}
    </div>
  );
}

function ToolbarDivider() {
  return <div className="mx-1 h-5 w-px bg-[var(--color-border)]" />;
}

function ToolbarButton({
  children,
  onClick,
  active,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex size-8 items-center justify-center transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] disabled:opacity-40 ${
        active ? "bg-[var(--color-accent-primary)]/15 text-[var(--color-accent-primary)]" : "text-[var(--color-text-secondary)]"
      }`}
    >
      {children}
    </button>
  );
}
