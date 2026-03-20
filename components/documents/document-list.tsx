"use client";

import {
  ChevronRight,
  Download,
  Edit3,
  Eye,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Globe,
  Grid3X3,
  HardDrive,
  List,
  Loader2,
  Lock,
  MoreVertical,
  MoveRight,
  Search,
  Share2,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useRef, useState, useEffect, useCallback, type ComponentType } from "react";
import { toast } from "sonner";

import { WordIcon, PowerPointIcon, ExcelIcon, PdfIcon, TextFileIcon } from "@/components/icons/file-icons";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";

type DocView = "all" | "mine" | "shared";

interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { documents: number; children: number };
  createdBy: { id: string; firstName: string; lastName: string };
}

interface AccessEntry {
  userId: string;
  accessLevel: "viewer" | "editor";
}

interface DocumentItem {
  id: string;
  title: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  folderId: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
  folder?: { id?: string; name?: string; isPublic: boolean } | null;
  accessList: AccessEntry[];
  _count: { versions: number };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}

const VIEW_TABS: { key: DocView; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { key: "all", label: "All Files", icon: HardDrive },
  { key: "mine", label: "My Files", icon: FileText },
  { key: "shared", label: "Shared with me", icon: Users },
];

export function DocumentList({ projectId, currentUserId }: { projectId: string; currentUserId: string }) {
  const { workspaceSlug, projectKey } = useParams<{ workspaceSlug: string; projectKey: string }>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [activeView, setActiveView] = useState<DocView>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Folder modal state
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  // Rename modal state
  const [renameTarget, setRenameTarget] = useState<{ type: "folder" | "document"; id: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Move modal state
  const [moveTarget, setMoveTarget] = useState<{ id: string; title: string } | null>(null);
  const [moveToFolderId, setMoveToFolderId] = useState<string | null>(null);

  // Share modal state
  const [shareDoc, setShareDoc] = useState<DocumentItem | null>(null);
  const [shareAccessList, setShareAccessList] = useState<
    { id: string; accessLevel: string; user: { id: string; firstName: string; lastName: string; email: string; avatarUrl: string | null }; grantedBy: { id: string; firstName: string; lastName: string } }[]
  >([]);
  const [projectMembers, setProjectMembers] = useState<
    { id: string; firstName: string; lastName: string; email: string; avatarUrl: string | null }[]
  >([]);
  const [shareLoading, setShareLoading] = useState(false);
  const [grantUserId, setGrantUserId] = useState("");
  const [grantLevel, setGrantLevel] = useState<"viewer" | "editor">("viewer");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchAll = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (activeView === "shared") {
        params.set("view", "shared");
      } else if (activeView === "mine") {
        params.set("view", "mine");
        params.set("folderId", currentFolderId ?? "root");
      } else {
        params.set("folderId", currentFolderId ?? "root");
      }
      if (debouncedSearch) params.set("q", debouncedSearch);

      const [docsRes, foldersRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/documents?${params}`),
        fetch(`/api/projects/${projectId}/documents/folders`),
      ]);
      const docsData = await docsRes.json();
      const foldersData = await foldersRes.json();
      if (docsRes.ok) setDocuments(docsData.data);
      if (foldersRes.ok) setFolders(foldersData.data);
    } catch {
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [projectId, currentFolderId, activeView, debouncedSearch]);

  useEffect(() => {
    setLoading(true);
    void fetchAll();
  }, [fetchAll]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpenId) return;
    const handler = () => setMenuOpenId(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [menuOpenId]);

  const currentFolders = activeView === "shared" ? [] : folders.filter((f) => f.parentId === currentFolderId);

  // Build breadcrumb path
  const breadcrumbs: { id: string | null; name: string }[] = [{ id: null, name: "Documents" }];
  if (currentFolderId && activeView !== "shared") {
    const path: FolderItem[] = [];
    let current = folders.find((f) => f.id === currentFolderId);
    while (current) {
      path.unshift(current);
      current = current.parentId ? folders.find((f) => f.id === current!.parentId) : undefined;
    }
    for (const folder of path) {
      breadcrumbs.push({ id: folder.id, name: folder.name });
    }
  }

  // Get total storage used
  const totalSize = documents.reduce((sum, d) => sum + d.fileSize, 0);

  function switchView(view: DocView) {
    setActiveView(view);
    setCurrentFolderId(null);
    setSearchQuery("");
  }

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      let contentType = file.type || "";
      const ext = file.name.split(".").pop()?.toLowerCase();

      if (!contentType || contentType === "application/octet-stream") {
        const mimeMap: Record<string, string> = {
          pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          ppt: "application/vnd.ms-powerpoint",
          docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          doc: "application/msword",
          xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          xls: "application/vnd.ms-excel",
          pdf: "application/pdf",
          txt: "text/plain",
          md: "text/markdown",
          csv: "text/csv",
          html: "text/html",
          htm: "text/html",
          css: "text/css",
          js: "text/javascript",
          json: "application/json",
          xml: "application/xml",
        };
        if (ext && mimeMap[ext]) contentType = mimeMap[ext];
      }

      const presignRes = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "document", fileName: file.name, contentType, fileSize: file.size, projectId }),
      });
      if (!presignRes.ok) {
        const err = await presignRes.json();
        throw new Error(err.error ?? "Failed to prepare upload");
      }
      const { data: presign } = await presignRes.json();

      const uploadRes = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType, "x-amz-acl": "public-read" },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Failed to upload file to storage");

      const registerRes = await fetch(`/api/projects/${projectId}/documents/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileKey: presign.key,
          fileUrl: presign.fileUrl,
          fileSize: file.size,
          mimeType: contentType,
          folderId: currentFolderId || null,
        }),
      });
      if (!registerRes.ok) {
        const err = await registerRes.json();
        throw new Error(err.error ?? "Failed to register document");
      }

      toast.success("Document uploaded");
      void fetchAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload document");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName.trim(), parentId: currentFolderId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create folder");
      }
      toast.success("Folder created");
      setShowCreateFolder(false);
      setNewFolderName("");
      void fetchAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create folder");
    } finally {
      setCreatingFolder(false);
    }
  }

  async function handleDeleteDocument(docId: string) {
    setDeletingId(docId);
    setMenuOpenId(null);
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to delete");
      }
      toast.success("Document deleted");
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeleteFolder(folderId: string) {
    setMenuOpenId(null);
    try {
      const res = await fetch(`/api/documents/folders/${folderId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to delete folder");
      }
      toast.success("Folder deleted");
      void fetchAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete folder");
    }
  }

  async function handleRename() {
    if (!renameTarget || !renameValue.trim()) return;
    try {
      const url = renameTarget.type === "folder"
        ? `/api/documents/folders/${renameTarget.id}`
        : `/api/documents/${renameTarget.id}`;
      const body = renameTarget.type === "folder"
        ? { name: renameValue.trim() }
        : { title: renameValue.trim() };

      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to rename");
      toast.success("Renamed successfully");
      setRenameTarget(null);
      void fetchAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to rename");
    }
  }

  async function handleMove() {
    if (!moveTarget) return;
    try {
      const res = await fetch(`/api/documents/${moveTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: moveToFolderId }),
      });
      if (!res.ok) throw new Error("Failed to move document");
      toast.success("Document moved");
      setMoveTarget(null);
      void fetchAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to move");
    }
  }

  async function openShareModal(doc: DocumentItem) {
    setShareDoc(doc);
    setShareLoading(true);
    setGrantUserId("");
    setGrantLevel("viewer");
    try {
      const [accessRes, membersRes] = await Promise.all([
        fetch(`/api/documents/${doc.id}/access`),
        fetch(`/api/projects/${projectId}/members`),
      ]);
      if (accessRes.ok) {
        const data = await accessRes.json();
        setShareAccessList(data.data.accessList);
      }
      if (membersRes.ok) {
        const data = await membersRes.json();
        const members = (data.data || []).map((m: { user: { id: string; firstName: string; lastName: string; email: string; avatarUrl: string | null } }) => m.user);
        setProjectMembers(members);
      }
    } catch {
      toast.error("Failed to load sharing info");
    } finally {
      setShareLoading(false);
    }
  }

  async function handleGrantAccess() {
    if (!shareDoc || !grantUserId) return;
    try {
      const res = await fetch(`/api/documents/${shareDoc.id}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: grantUserId, accessLevel: grantLevel }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to grant access");
      }
      toast.success("Access granted");
      const accessRes = await fetch(`/api/documents/${shareDoc.id}/access`);
      if (accessRes.ok) {
        const data = await accessRes.json();
        setShareAccessList(data.data.accessList);
      }
      setGrantUserId("");
      void fetchAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to grant access");
    }
  }

  async function handleRevokeAccess(userId: string) {
    if (!shareDoc) return;
    try {
      const res = await fetch(`/api/documents/${shareDoc.id}/access`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error("Failed to revoke access");
      toast.success("Access revoked");
      setShareAccessList((prev) => prev.filter((a) => a.user.id !== userId));
      void fetchAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke access");
    }
  }

  function getDocAccessBadge(doc: DocumentItem) {
    if (doc.folder?.isPublic) return { icon: Globe, label: "Public", color: "text-green-400", bg: "bg-green-400/10" };
    if (doc.accessList.length > 0) return { icon: Users, label: "Shared", color: "text-blue-400", bg: "bg-blue-400/10" };
    return { icon: Lock, label: "Private", color: "text-[var(--color-text-tertiary)]", bg: "bg-[var(--color-bg-tertiary)]" };
  }

  function isDocOwner(doc: DocumentItem) {
    return doc.createdById === currentUserId || doc.createdBy?.id === currentUserId;
  }

  function isPresentation(doc: DocumentItem) {
    return doc.mimeType === "application/vnd.ms-powerpoint" ||
      doc.mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  }

  function isSpreadsheet(doc: DocumentItem) {
    return doc.mimeType === "application/vnd.ms-excel" ||
      doc.mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }

  function isPdf(doc: DocumentItem) {
    return doc.mimeType === "application/pdf";
  }

  function isTextFile(doc: DocumentItem) {
    return doc.mimeType.startsWith("text/") ||
      doc.mimeType === "application/json" ||
      doc.mimeType === "application/xml";
  }

  function getDocFileIcon(doc: DocumentItem): ComponentType<{ size?: number; className?: string }> {
    if (isPresentation(doc)) return PowerPointIcon;
    if (isSpreadsheet(doc)) return ExcelIcon;
    if (isPdf(doc)) return PdfIcon;
    if (isTextFile(doc)) return TextFileIcon;
    return WordIcon;
  }

  function getTypeColor(doc: DocumentItem): string {
    if (isPresentation(doc)) return "border-l-orange-500";
    if (isSpreadsheet(doc)) return "border-l-green-500";
    if (isPdf(doc)) return "border-l-red-500";
    if (isTextFile(doc)) return "border-l-gray-400";
    return "border-l-blue-500";
  }

  const basePath = `/w/${workspaceSlug}/p/${projectKey}/documents`;

  function renderContextMenu(
    id: string,
    menuKey: string,
    type: "folder" | "document",
    item: FolderItem | DocumentItem,
  ) {
    if (menuOpenId !== menuKey) return null;
    const owner = type === "document" ? isDocOwner(item as DocumentItem) : (item as FolderItem).createdBy.id === currentUserId;
    return (
      <div
        className="absolute right-0 top-full z-30 mt-1 w-44 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] py-1 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {type === "document" && (
          <>
            <Link
              href={`${basePath}/${id}`}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
              onClick={() => setMenuOpenId(null)}
            >
              <Eye className="size-3.5" /> View
            </Link>
            <Link
              href={`${basePath}/${id}/edit`}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
              onClick={() => setMenuOpenId(null)}
            >
              <Edit3 className="size-3.5" /> Edit
            </Link>
            <a
              href={(item as DocumentItem).fileUrl}
              download
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
              onClick={() => setMenuOpenId(null)}
            >
              <Download className="size-3.5" /> Download
            </a>
          </>
        )}
        {owner && (
          <>
            {type === "document" && (
              <button
                type="button"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
                onClick={() => { void openShareModal(item as DocumentItem); setMenuOpenId(null); }}
              >
                <Share2 className="size-3.5" /> Share
              </button>
            )}
            <button
              type="button"
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
              onClick={() => {
                const name = type === "folder" ? (item as FolderItem).name : (item as DocumentItem).title;
                setRenameTarget({ type, id, name });
                setRenameValue(name);
                setMenuOpenId(null);
              }}
            >
              <Edit3 className="size-3.5" /> Rename
            </button>
            {type === "document" && (
              <button
                type="button"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
                onClick={() => {
                  const doc = item as DocumentItem;
                  setMoveTarget({ id: doc.id, title: doc.title });
                  setMoveToFolderId(doc.folderId);
                  setMenuOpenId(null);
                }}
              >
                <MoveRight className="size-3.5" /> Move to...
              </button>
            )}
            <div className="my-1 border-t border-[var(--color-border)]" />
            <button
              type="button"
              onClick={() => type === "folder" ? void handleDeleteFolder(id) : void handleDeleteDocument(id)}
              disabled={type === "document" && deletingId === id}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[var(--color-error)] transition-colors hover:bg-red-500/10"
            >
              <Trash2 className="size-3.5" />
              {type === "document" && deletingId === id ? "Deleting..." : "Delete"}
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col">
      {/* ── Top Bar ── */}
      <div className="mb-4 flex flex-col gap-3">
        {/* Row 1: Title + actions */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">Documents</h1>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-[var(--color-text-tertiary)] sm:inline">
              {documents.length} file{documents.length !== 1 ? "s" : ""}
              {totalSize > 0 && <> &middot; {formatFileSize(totalSize)}</>}
            </span>
            <div className="flex border border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`inline-flex size-8 items-center justify-center transition-colors ${viewMode === "list" ? "bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]" : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"}`}
              >
                <List className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`inline-flex size-8 items-center justify-center border-l border-[var(--color-border)] transition-colors ${viewMode === "grid" ? "bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]" : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"}`}
              >
                <Grid3X3 className="size-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: View tabs + search + folder/upload buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* View tabs */}
          <div className="flex border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            {VIEW_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => switchView(tab.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeView === tab.key
                      ? "bg-[var(--color-accent-primary)] text-white"
                      : "text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  <Icon className="size-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="h-8 pl-8 text-xs"
            />
          </div>

          {/* Actions */}
          <div className="ml-auto flex items-center gap-1.5">
            {activeView !== "shared" && (
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowCreateFolder(true)}>
                <FolderPlus className="mr-1.5 size-3.5" />
                <span className="hidden sm:inline">New Folder</span>
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".doc,.docx,.ppt,.pptx,.xls,.xlsx,.pdf,.txt,.md,.csv,.html,.css,.js,.json,.xml,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/pdf,text/plain,text/markdown,text/csv,text/html,text/css,text/javascript,application/json,application/xml,text/xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUpload(file);
              }}
            />
            <Button type="button" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
              {uploading ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Upload className="mr-1.5 size-3.5" />}
              <span className="hidden sm:inline">{uploading ? "Uploading..." : "Upload"}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Breadcrumbs ── */}
      {breadcrumbs.length > 1 && activeView !== "shared" && (
        <nav className="mb-3 flex items-center gap-1 text-xs text-[var(--color-text-tertiary)]">
          {breadcrumbs.map((bc, i) => (
            <div key={bc.id ?? "root"} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="size-3 text-[var(--color-text-tertiary)]" />}
              <button
                type="button"
                onClick={() => setCurrentFolderId(bc.id)}
                className={`flex items-center gap-1 px-1.5 py-0.5 transition-colors ${
                  i === breadcrumbs.length - 1
                    ? "font-medium text-[var(--color-text-primary)]"
                    : "hover:text-[var(--color-text-primary)]"
                }`}
              >
                {i === 0 && <HardDrive className="size-3" />}
                {bc.name}
              </button>
            </div>
          ))}
        </nav>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-[var(--color-text-tertiary)]" />
        </div>
      ) : currentFolders.length === 0 && documents.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-[var(--color-bg-tertiary)]">
            {activeView === "shared" ? (
              <Users className="size-7 text-[var(--color-text-tertiary)]" />
            ) : debouncedSearch ? (
              <Search className="size-7 text-[var(--color-text-tertiary)]" />
            ) : (
              <FileText className="size-7 text-[var(--color-text-tertiary)]" />
            )}
          </div>
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">
            {debouncedSearch
              ? "No files match your search"
              : activeView === "shared"
                ? "No files have been shared with you yet"
                : "No documents yet"}
          </p>
          <p className="mt-1 max-w-xs text-xs text-[var(--color-text-tertiary)]">
            {debouncedSearch
              ? "Try different keywords or clear your search"
              : activeView === "shared"
                ? "When someone shares a document with you, it will appear here"
                : "Upload a document or create a folder to get started"}
          </p>
          {!debouncedSearch && activeView !== "shared" && (
            <div className="mt-5 flex gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowCreateFolder(true)}>
                <FolderPlus className="mr-1.5 size-3.5" /> New Folder
              </Button>
              <Button type="button" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-1.5 size-3.5" /> Upload
              </Button>
            </div>
          )}
        </div>
      ) : viewMode === "list" ? (
        /* ════ LIST VIEW ════ */
        <div className="overflow-hidden border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
          {/* Table header */}
          <div className="flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg-primary)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
            <span className="flex-1">Name</span>
            <span className="hidden w-20 shrink-0 sm:block">Access</span>
            <span className="hidden w-16 shrink-0 text-right md:block">Size</span>
            <span className="hidden w-32 shrink-0 lg:block">Owner</span>
            {activeView === "shared" && <span className="hidden w-28 shrink-0 lg:block">Location</span>}
            <span className="w-24 shrink-0 text-right">Modified</span>
            <span className="w-8 shrink-0" />
          </div>

          {/* Folders */}
          {currentFolders.map((folder) => {
            const menuKey = `f-${folder.id}`;
            return (
              <div
                key={folder.id}
                className="group flex cursor-pointer items-center gap-3 border-b border-[var(--color-border)] px-4 py-2.5 transition-colors last:border-b-0 hover:bg-[var(--color-bg-primary)]/50"
                onClick={() => setCurrentFolderId(folder.id)}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  {folder.isPublic ? (
                    <FolderOpen className="size-4 shrink-0 text-green-500" />
                  ) : (
                    <Folder className="size-4 shrink-0 text-yellow-500" />
                  )}
                  <span className="truncate text-sm font-medium text-[var(--color-text-primary)]">{folder.name}</span>
                  {folder.isPublic && (
                    <span className="inline-flex items-center gap-1 rounded-sm bg-green-500/10 px-1.5 py-0.5 text-[10px] font-medium text-green-400">
                      <Globe className="size-2.5" /> Public
                    </span>
                  )}
                  <span className="shrink-0 text-[11px] text-[var(--color-text-tertiary)]">
                    {folder._count.documents + folder._count.children} item{(folder._count.documents + folder._count.children) !== 1 ? "s" : ""}
                  </span>
                </div>
                <span className="hidden w-20 shrink-0 sm:block" />
                <span className="hidden w-16 shrink-0 md:block" />
                <span className="hidden w-32 shrink-0 lg:block" />
                {activeView === "shared" && <span className="hidden w-28 shrink-0 lg:block" />}
                <span className="w-24 shrink-0 text-right text-xs text-[var(--color-text-tertiary)]">
                  {formatDateRelative(folder.updatedAt)}
                </span>
                <div className="relative w-8 shrink-0">
                  {!folder.isPublic && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === menuKey ? null : menuKey); }}
                        className="inline-flex size-7 items-center justify-center text-[var(--color-text-tertiary)] opacity-0 transition-all hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] group-hover:opacity-100"
                      >
                        <MoreVertical className="size-3.5" />
                      </button>
                      {renderContextMenu(folder.id, menuKey, "folder", folder)}
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {/* Documents */}
          {documents.map((doc) => {
            const badge = getDocAccessBadge(doc);
            const BadgeIcon = badge.icon;
            const owner = isDocOwner(doc);
            const DocIcon = getDocFileIcon(doc);
            const menuKey = `d-${doc.id}`;
            return (
              <div
                key={doc.id}
                className={`group flex items-center gap-3 border-b border-l-2 border-[var(--color-border)] px-4 py-2.5 transition-colors last:border-b-0 hover:bg-[var(--color-bg-primary)]/50 ${getTypeColor(doc)}`}
              >
                <Link href={`${basePath}/${doc.id}`} className="flex min-w-0 flex-1 items-center gap-2.5">
                  <DocIcon size={18} className="shrink-0" />
                  <span className="truncate text-sm text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-primary)]">
                    {doc.title}
                  </span>
                  {doc._count.versions > 0 && (
                    <span className="shrink-0 text-[10px] text-[var(--color-text-tertiary)]">v{doc._count.versions + 1}</span>
                  )}
                </Link>

                <button
                  type="button"
                  onClick={() => owner ? void openShareModal(doc) : undefined}
                  className={`hidden w-20 shrink-0 items-center gap-1 text-xs sm:flex ${badge.color} ${owner ? "hover:underline" : ""}`}
                  disabled={!owner}
                >
                  <BadgeIcon className="size-3" /> {badge.label}
                </button>

                <span className="hidden w-16 shrink-0 text-right text-xs text-[var(--color-text-tertiary)] md:block">
                  {formatFileSize(doc.fileSize)}
                </span>

                <span className="hidden w-32 shrink-0 truncate text-xs text-[var(--color-text-secondary)] lg:block">
                  {doc.createdBy.firstName} {doc.createdBy.lastName}
                </span>

                {activeView === "shared" && doc.folder && (
                  <span className="hidden w-28 shrink-0 truncate text-xs text-[var(--color-text-tertiary)] lg:block">
                    {doc.folder.name || "Root"}
                  </span>
                )}

                <span className="w-24 shrink-0 text-right text-xs text-[var(--color-text-tertiary)]">
                  {formatDateRelative(doc.updatedAt)}
                </span>

                <div className="relative w-8 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === menuKey ? null : menuKey); }}
                    className="inline-flex size-7 items-center justify-center text-[var(--color-text-tertiary)] opacity-0 transition-all hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] group-hover:opacity-100"
                  >
                    <MoreVertical className="size-3.5" />
                  </button>
                  {renderContextMenu(doc.id, menuKey, "document", doc)}
                </div>
              </div>
            );
          })}

          {currentFolders.length === 0 && documents.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-[var(--color-text-tertiary)]">
              This folder is empty
            </div>
          )}
        </div>
      ) : (
        /* ════ GRID VIEW ════ */
        <div className="space-y-6">
          {/* Folders */}
          {currentFolders.length > 0 && (
            <div>
              <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">Folders</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {currentFolders.map((folder) => {
                  const menuKey = `f-${folder.id}`;
                  return (
                    <div
                      key={folder.id}
                      className="group relative flex cursor-pointer items-center gap-2.5 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-3 transition-colors hover:border-[var(--color-accent-primary)]/30 hover:bg-[var(--color-bg-primary)]"
                      onClick={() => setCurrentFolderId(folder.id)}
                    >
                      {folder.isPublic ? (
                        <FolderOpen className="size-5 shrink-0 text-green-500" />
                      ) : (
                        <Folder className="size-5 shrink-0 text-yellow-500" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">{folder.name}</p>
                        <p className="text-[10px] text-[var(--color-text-tertiary)]">
                          {folder._count.documents + folder._count.children} item{(folder._count.documents + folder._count.children) !== 1 ? "s" : ""}
                        </p>
                      </div>
                      {!folder.isPublic && (
                        <div className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === menuKey ? null : menuKey); }}
                            className="inline-flex size-6 items-center justify-center text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-tertiary)]"
                          >
                            <MoreVertical className="size-3.5" />
                          </button>
                          {renderContextMenu(folder.id, menuKey, "folder", folder)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Documents */}
          {documents.length > 0 && (
            <div>
              <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">Files</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {documents.map((doc) => {
                  const badge = getDocAccessBadge(doc);
                  const BadgeIcon = badge.icon;
                  const DocIcon = getDocFileIcon(doc);
                  const menuKey = `d-${doc.id}`;
                  return (
                    <div
                      key={doc.id}
                      className={`group relative border border-[var(--color-border)] border-l-2 bg-[var(--color-bg-secondary)] transition-colors hover:border-[var(--color-accent-primary)]/30 hover:bg-[var(--color-bg-primary)] ${getTypeColor(doc)}`}
                    >
                      <Link href={`${basePath}/${doc.id}`} className="flex flex-col items-center px-3 pb-3 pt-6">
                        <DocIcon size={36} />
                        <p className="mt-2.5 max-w-full truncate text-center text-sm font-medium text-[var(--color-text-primary)]">
                          {doc.title}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-[var(--color-text-tertiary)]">
                          <span className={`flex items-center gap-0.5 ${badge.color}`}>
                            <BadgeIcon className="size-2.5" /> {badge.label}
                          </span>
                          <span>&middot;</span>
                          <span>{formatFileSize(doc.fileSize)}</span>
                        </div>
                        <p className="mt-0.5 text-[10px] text-[var(--color-text-tertiary)]">
                          {formatDateRelative(doc.updatedAt)}
                        </p>
                      </Link>

                      <div className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === menuKey ? null : menuKey); }}
                          className="inline-flex size-6 items-center justify-center text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-tertiary)]"
                        >
                          <MoreVertical className="size-3.5" />
                        </button>
                        {renderContextMenu(doc.id, menuKey, "document", doc)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════ Modals ════ */}

      {/* Create Folder */}
      <Modal open={showCreateFolder} onOpenChange={setShowCreateFolder} title="Create Folder">
        <form
          onSubmit={(e) => { e.preventDefault(); void handleCreateFolder(); }}
          className="space-y-4 p-5"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">Folder name</label>
            <Input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Enter folder name..." autoFocus />
          </div>
          {currentFolderId && (
            <p className="text-xs text-[var(--color-text-tertiary)]">
              Creating inside: {breadcrumbs[breadcrumbs.length - 1]?.name}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowCreateFolder(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={creatingFolder || !newFolderName.trim()}>
              {creatingFolder ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Rename */}
      <Modal open={!!renameTarget} onOpenChange={() => setRenameTarget(null)} title={`Rename ${renameTarget?.type === "folder" ? "Folder" : "Document"}`}>
        <form
          onSubmit={(e) => { e.preventDefault(); void handleRename(); }}
          className="space-y-4 p-5"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">Name</label>
            <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setRenameTarget(null)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={!renameValue.trim()}>Rename</Button>
          </div>
        </form>
      </Modal>

      {/* Move Document */}
      <Modal open={!!moveTarget} onOpenChange={() => setMoveTarget(null)} title="Move Document">
        <div className="space-y-4 p-5">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Move &quot;{moveTarget?.title}&quot; to:
          </p>
          <div className="max-h-64 space-y-0.5 overflow-y-auto rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-1">
            <button
              type="button"
              onClick={() => setMoveToFolderId(null)}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                moveToFolderId === null
                  ? "bg-[var(--color-accent-primary)] text-white"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]"
              }`}
            >
              <HardDrive className="size-4" /> Root
            </button>
            {folders.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setMoveToFolderId(f.id)}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                  moveToFolderId === f.id
                    ? "bg-[var(--color-accent-primary)] text-white"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]"
                }`}
                style={{ paddingLeft: f.parentId ? "2rem" : undefined }}
              >
                <Folder className="size-4" /> {f.name} {f.isPublic && <Globe className="size-3 text-green-400" />}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setMoveTarget(null)}>Cancel</Button>
            <Button type="button" size="sm" onClick={() => void handleMove()}>Move</Button>
          </div>
        </div>
      </Modal>

      {/* Share Document */}
      <Modal open={!!shareDoc} onOpenChange={() => setShareDoc(null)} title="Share Document">
        <div className="space-y-5 p-5">
          <div className="flex items-center gap-3">
            {shareDoc && (() => { const DocIcon = getDocFileIcon(shareDoc); return <DocIcon size={24} />; })()}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">{shareDoc?.title}</p>
              <p className="text-xs text-[var(--color-text-tertiary)]">{shareDoc && formatFileSize(shareDoc.fileSize)}</p>
            </div>
          </div>

          {shareLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-5 animate-spin text-[var(--color-text-tertiary)]" />
            </div>
          ) : (
            <>
              {/* Grant access form */}
              <div className="border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                  Add people
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={grantUserId}
                    onChange={(e) => setGrantUserId(e.target.value)}
                    className="h-9 flex-1 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-primary)]"
                  >
                    <option value="">Select a member...</option>
                    {projectMembers
                      .filter((m) => m.id !== currentUserId && !shareAccessList.some((a) => a.user.id === m.id))
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.firstName} {m.lastName} ({m.email})
                        </option>
                      ))}
                  </select>
                  <select
                    value={grantLevel}
                    onChange={(e) => setGrantLevel(e.target.value as "viewer" | "editor")}
                    className="h-9 w-28 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-primary)]"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                  </select>
                  <Button type="button" size="sm" disabled={!grantUserId} onClick={() => void handleGrantAccess()}>
                    Share
                  </Button>
                </div>
              </div>

              {/* Current access list */}
              <div>
                <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                  People with access
                </h4>
                <div className="divide-y divide-[var(--color-border)] border border-[var(--color-border)]">
                  {/* Owner */}
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <div className="flex size-8 items-center justify-center rounded-full bg-[var(--color-accent-primary)] text-xs font-bold text-white">
                      {shareDoc?.createdBy.firstName[0]}{shareDoc?.createdBy.lastName[0]}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">
                        {shareDoc?.createdBy.firstName} {shareDoc?.createdBy.lastName}
                      </p>
                    </div>
                    <span className="inline-flex items-center rounded-sm bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                      Owner
                    </span>
                  </div>

                  {shareAccessList.map((entry) => (
                    <div key={entry.user.id} className="flex items-center gap-3 px-3 py-2.5">
                      <div className="flex size-8 items-center justify-center rounded-full bg-[var(--color-bg-tertiary)] text-xs font-bold text-[var(--color-text-secondary)]">
                        {entry.user.firstName[0]}{entry.user.lastName[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                          {entry.user.firstName} {entry.user.lastName}
                        </p>
                        <p className="truncate text-xs text-[var(--color-text-tertiary)]">{entry.user.email}</p>
                      </div>
                      <span className={`text-[10px] font-medium uppercase tracking-wider ${entry.accessLevel === "editor" ? "text-blue-400" : "text-[var(--color-text-tertiary)]"}`}>
                        {entry.accessLevel === "editor" ? "Editor" : "Viewer"}
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleRevokeAccess(entry.user.id)}
                        className="inline-flex size-7 items-center justify-center text-[var(--color-text-tertiary)] transition-colors hover:bg-red-500/10 hover:text-[var(--color-error)]"
                        title="Revoke access"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}

                  {shareAccessList.length === 0 && (
                    <p className="px-3 py-4 text-center text-xs text-[var(--color-text-tertiary)]">
                      No one else has access to this document
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
