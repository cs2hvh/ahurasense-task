"use client";

import {
  ChevronRight,
  Edit3,
  Eye,
  FileText,
  Folder,
  FolderPlus,
  Globe,
  Grid3X3,
  List,
  Loader2,
  Lock,
  MoreVertical,
  MoveRight,
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
  folder?: { isPublic: boolean } | null;
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

  const fetchAll = useCallback(async () => {
    try {
      const [docsRes, foldersRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/documents?folderId=${currentFolderId ?? "root"}`),
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
  }, [projectId, currentFolderId]);

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

  const currentFolders = folders.filter((f) => f.parentId === currentFolderId);

  // Build breadcrumb path
  const breadcrumbs: { id: string | null; name: string }[] = [{ id: null, name: "Documents" }];
  if (currentFolderId) {
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

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      let contentType = file.type || "";
      const ext = file.name.split(".").pop()?.toLowerCase();

      // Browsers sometimes report empty or generic MIME for office files
      if (!contentType || contentType === "application/octet-stream") {
        if (ext === "pptx") contentType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
        else if (ext === "ppt") contentType = "application/vnd.ms-powerpoint";
        else if (ext === "docx") contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        else if (ext === "doc") contentType = "application/msword";
        else if (ext === "xlsx") contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        else if (ext === "xls") contentType = "application/vnd.ms-excel";
        else if (ext === "pdf") contentType = "application/pdf";
        else if (ext === "txt") contentType = "text/plain";
        else if (ext === "md") contentType = "text/markdown";
        else if (ext === "csv") contentType = "text/csv";
        else if (ext === "html" || ext === "htm") contentType = "text/html";
        else if (ext === "css") contentType = "text/css";
        else if (ext === "js") contentType = "text/javascript";
        else if (ext === "json") contentType = "application/json";
        else if (ext === "xml") contentType = "application/xml";
      }

      // Step 1: Get presigned upload URL
      const presignRes = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "document",
          fileName: file.name,
          contentType,
          fileSize: file.size,
          projectId,
        }),
      });

      if (!presignRes.ok) {
        const err = await presignRes.json();
        throw new Error(err.error ?? "Failed to prepare upload");
      }

      const { data: presign } = await presignRes.json();

      // Step 2: Upload file directly to S3 via presigned URL
      const uploadRes = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": contentType,
          "x-amz-acl": "public-read",
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload file to storage");
      }

      // Step 3: Register document in database
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
        // members API returns users nested under .user
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
      // Refresh access list
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
    if (doc.folder?.isPublic) return { icon: Globe, label: "Public", color: "text-green-400" };
    if (doc.accessList.length > 0) return { icon: Users, label: "Shared", color: "text-blue-400" };
    return { icon: Lock, label: "Private", color: "text-[var(--color-text-tertiary)]" };
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

  const basePath = `/w/${workspaceSlug}/p/${projectKey}/documents`;

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Documents</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="mr-1 flex rounded-md border border-[var(--color-border)]">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`inline-flex size-8 items-center justify-center rounded-l-md transition-colors ${viewMode === "list" ? "bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]" : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"}`}
            >
              <List className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`inline-flex size-8 items-center justify-center rounded-r-md border-l border-[var(--color-border)] transition-colors ${viewMode === "grid" ? "bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]" : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"}`}
            >
              <Grid3X3 className="size-3.5" />
            </button>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={() => setShowCreateFolder(true)}>
            <FolderPlus className="mr-1.5 size-3.5" />
            New Folder
          </Button>
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
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </div>

      {/* Breadcrumbs */}
      {breadcrumbs.length > 1 && (
        <div className="mb-4 flex items-center gap-1 text-xs text-[var(--color-text-tertiary)]">
          {breadcrumbs.map((bc, i) => (
            <div key={bc.id ?? "root"} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="size-3" />}
              <button
                type="button"
                onClick={() => setCurrentFolderId(bc.id)}
                className={`px-1 py-0.5 transition-colors ${
                  i === breadcrumbs.length - 1
                    ? "font-medium text-[var(--color-text-primary)]"
                    : "hover:text-[var(--color-text-primary)]"
                }`}
              >
                {bc.name}
              </button>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-5 animate-spin text-[var(--color-text-tertiary)]" />
        </div>
      ) : currentFolders.length === 0 && documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-[var(--color-bg-tertiary)]">
            <FileText className="size-5 text-[var(--color-text-tertiary)]" />
          </div>
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">No documents yet</p>
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
            Upload a document or create a folder to get started
          </p>
          <div className="mt-4 flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowCreateFolder(true)}>
              <FolderPlus className="mr-1.5 size-3.5" />
              New Folder
            </Button>
            <Button type="button" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-1.5 size-3.5" />
              Upload
            </Button>
          </div>
        </div>
      ) : viewMode === "list" ? (
        <div className="rounded-lg border border-[var(--color-border)]">
          {/* Table header */}
          <div className="flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-tertiary)]">
            <span className="flex-1">Name</span>
            <span className="hidden w-20 shrink-0 sm:block">Access</span>
            <span className="hidden w-16 shrink-0 text-right md:block">Size</span>
            <span className="hidden w-28 shrink-0 lg:block">Owner</span>
            <span className="w-24 shrink-0 text-right">Modified</span>
            <span className="w-8 shrink-0" />
          </div>

          {/* Folders */}
          {currentFolders.map((folder) => (
            <div
              key={folder.id}
              className="group flex cursor-pointer items-center gap-3 border-b border-[var(--color-border)] px-4 py-2.5 transition-colors last:border-b-0 hover:bg-[var(--color-bg-secondary)]"
              onClick={() => setCurrentFolderId(folder.id)}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <Folder className={`size-4 shrink-0 ${folder.isPublic ? "text-green-500" : "text-yellow-500"}`} />
                <span className="truncate text-sm text-[var(--color-text-primary)]">
                  {folder.name}
                </span>
                {folder.isPublic && <Globe className="size-3 shrink-0 text-green-400" />}
                <span className="shrink-0 text-xs text-[var(--color-text-tertiary)]">
                  {folder._count.documents} item{folder._count.documents !== 1 ? "s" : ""}
                </span>
              </div>
              <span className="hidden w-20 shrink-0 sm:block" />
              <span className="hidden w-16 shrink-0 md:block" />
              <span className="hidden w-28 shrink-0 lg:block" />
              <span className="w-24 shrink-0 text-right text-xs text-[var(--color-text-tertiary)]">
                {formatDate(folder.updatedAt)}
              </span>
              <div className="relative w-8 shrink-0">
                {!folder.isPublic && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === `f-${folder.id}` ? null : `f-${folder.id}`); }}
                      className="inline-flex size-7 items-center justify-center rounded text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
                    >
                      <MoreVertical className="size-3.5" />
                    </button>
                    {menuOpenId === `f-${folder.id}` && (
                      <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] py-1 shadow-lg" onClick={(e) => e.stopPropagation()}>
                        <button type="button" className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]"
                          onClick={() => { setRenameTarget({ type: "folder", id: folder.id, name: folder.name }); setRenameValue(folder.name); setMenuOpenId(null); }}>
                          <Edit3 className="size-3.5" /> Rename
                        </button>
                        <button type="button" className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[var(--color-error)] hover:bg-[var(--color-bg-tertiary)]"
                          onClick={() => void handleDeleteFolder(folder.id)}>
                          <Trash2 className="size-3.5" /> Delete
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}

          {/* Documents */}
          {documents.map((doc) => {
            const badge = getDocAccessBadge(doc);
            const BadgeIcon = badge.icon;
            const owner = isDocOwner(doc);
            const DocIcon = getDocFileIcon(doc);
            return (
              <div
                key={doc.id}
                className="group flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-2.5 transition-colors last:border-b-0 hover:bg-[var(--color-bg-secondary)]"
              >
                <Link href={`${basePath}/${doc.id}`} className="flex min-w-0 flex-1 items-center gap-2.5">
                  <DocIcon size={18} className="shrink-0" />
                  <span className="truncate text-sm text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-primary)]">
                    {doc.title}
                  </span>
                </Link>

                <button
                  type="button"
                  onClick={() => void openShareModal(doc)}
                  className={`hidden w-20 shrink-0 items-center gap-1 text-xs sm:flex ${badge.color} hover:underline`}
                >
                  <BadgeIcon className="size-3" /> {badge.label}
                </button>

                <span className="hidden w-16 shrink-0 text-right text-xs text-[var(--color-text-tertiary)] md:block">{formatFileSize(doc.fileSize)}</span>

                <span className="hidden w-28 shrink-0 truncate text-xs text-[var(--color-text-tertiary)] lg:block">
                  {doc.createdBy.firstName} {doc.createdBy.lastName}
                </span>

                <span className="w-24 shrink-0 text-right text-xs text-[var(--color-text-tertiary)]">{formatDate(doc.updatedAt)}</span>

                <div className="relative w-8 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === `d-${doc.id}` ? null : `d-${doc.id}`); }}
                    className="inline-flex size-7 items-center justify-center rounded text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
                  >
                    <MoreVertical className="size-3.5" />
                  </button>
                  {menuOpenId === `d-${doc.id}` && (
                    <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] py-1 shadow-lg" onClick={(e) => e.stopPropagation()}>
                      <Link href={`${basePath}/${doc.id}`} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]" onClick={() => setMenuOpenId(null)}>
                        <Eye className="size-3.5" /> View
                      </Link>
                      <Link href={`${basePath}/${doc.id}/edit`} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]" onClick={() => setMenuOpenId(null)}>
                        <Edit3 className="size-3.5" /> Edit
                      </Link>
                      {owner && (
                        <>
                          <button type="button" className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]"
                            onClick={() => { void openShareModal(doc); setMenuOpenId(null); }}>
                            <Share2 className="size-3.5" /> Share
                          </button>
                          <button type="button" className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]"
                            onClick={() => { setRenameTarget({ type: "document", id: doc.id, name: doc.title }); setRenameValue(doc.title); setMenuOpenId(null); }}>
                            <Edit3 className="size-3.5" /> Rename
                          </button>
                          <button type="button" className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]"
                            onClick={() => { setMoveTarget({ id: doc.id, title: doc.title }); setMoveToFolderId(doc.folderId); setMenuOpenId(null); }}>
                            <MoveRight className="size-3.5" /> Move to...
                          </button>
                          <div className="my-1 border-t border-[var(--color-border)]" />
                          <button type="button" onClick={() => void handleDeleteDocument(doc.id)} disabled={deletingId === doc.id}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[var(--color-error)] hover:bg-[var(--color-bg-tertiary)]">
                            <Trash2 className="size-3.5" /> {deletingId === doc.id ? "Deleting..." : "Delete"}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {currentFolders.length === 0 && documents.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-[var(--color-text-tertiary)]">
              This folder is empty
            </div>
          )}
        </div>
      ) : (
        /* Grid view */
        <div>
          {/* Folders */}
          {currentFolders.length > 0 && (
            <div className="mb-5">
              <h3 className="mb-2 text-xs font-medium text-[var(--color-text-tertiary)]">Folders</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {currentFolders.map((folder) => (
                  <div
                    key={folder.id}
                    className="group relative flex cursor-pointer items-center gap-2.5 rounded-lg border border-[var(--color-border)] px-3 py-2.5 transition-colors hover:bg-[var(--color-bg-secondary)]"
                    onClick={() => setCurrentFolderId(folder.id)}
                  >
                    <Folder className={`size-5 shrink-0 ${folder.isPublic ? "text-green-500" : "text-yellow-500"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-[var(--color-text-primary)]">{folder.name}</p>
                      <p className="text-[11px] text-[var(--color-text-tertiary)]">
                        {folder._count.documents} item{folder._count.documents !== 1 ? "s" : ""}
                      </p>
                    </div>
                    {!folder.isPublic && (
                      <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === `f-${folder.id}` ? null : `f-${folder.id}`); }}
                          className="inline-flex size-6 items-center justify-center rounded text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-tertiary)]"
                        >
                          <MoreVertical className="size-3.5" />
                        </button>
                        {menuOpenId === `f-${folder.id}` && (
                          <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] py-1 shadow-lg" onClick={(e) => e.stopPropagation()}>
                            <button type="button" className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]"
                              onClick={() => { setRenameTarget({ type: "folder", id: folder.id, name: folder.name }); setRenameValue(folder.name); setMenuOpenId(null); }}>
                              <Edit3 className="size-3.5" /> Rename
                            </button>
                            <button type="button" className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[var(--color-error)] hover:bg-[var(--color-bg-tertiary)]"
                              onClick={() => void handleDeleteFolder(folder.id)}>
                              <Trash2 className="size-3.5" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents grid */}
          {documents.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-medium text-[var(--color-text-tertiary)]">Files</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {documents.map((doc) => {
                  const badge = getDocAccessBadge(doc);
                  const BadgeIcon = badge.icon;
                  const owner = isDocOwner(doc);
                  const DocIcon = getDocFileIcon(doc);
                  return (
                    <div
                      key={doc.id}
                      className="group relative rounded-lg border border-[var(--color-border)] transition-colors hover:bg-[var(--color-bg-secondary)]"
                    >
                      <Link href={`${basePath}/${doc.id}`} className="flex flex-col items-center px-3 pb-2 pt-5">
                        <DocIcon size={32} />
                        <p className="mt-2 max-w-full truncate text-center text-sm text-[var(--color-text-primary)]">{doc.title}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--color-text-tertiary)]">
                          <BadgeIcon className={`size-3 ${badge.color}`} />
                          {formatFileSize(doc.fileSize)} · {formatDate(doc.updatedAt)}
                        </p>
                      </Link>

                      <div className="absolute right-1 top-1">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === `d-${doc.id}` ? null : `d-${doc.id}`); }}
                          className="inline-flex size-6 items-center justify-center rounded text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-tertiary)]"
                        >
                          <MoreVertical className="size-3.5" />
                        </button>
                        {menuOpenId === `d-${doc.id}` && (
                          <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] py-1 shadow-lg" onClick={(e) => e.stopPropagation()}>
                            <Link href={`${basePath}/${doc.id}`} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]" onClick={() => setMenuOpenId(null)}>
                              <Eye className="size-3.5" /> View
                            </Link>
                            <Link href={`${basePath}/${doc.id}/edit`} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]" onClick={() => setMenuOpenId(null)}>
                              <Edit3 className="size-3.5" /> Edit
                            </Link>
                            {owner && (
                              <>
                                <button type="button" className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]"
                                  onClick={() => { void openShareModal(doc); setMenuOpenId(null); }}>
                                  <Share2 className="size-3.5" /> Share
                                </button>
                                <button type="button" className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]"
                                  onClick={() => { setRenameTarget({ type: "document", id: doc.id, name: doc.title }); setRenameValue(doc.title); setMenuOpenId(null); }}>
                                  <Edit3 className="size-3.5" /> Rename
                                </button>
                                <button type="button" className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]"
                                  onClick={() => { setMoveTarget({ id: doc.id, title: doc.title }); setMoveToFolderId(doc.folderId); setMenuOpenId(null); }}>
                                  <MoveRight className="size-3.5" /> Move to...
                                </button>
                                <div className="my-1 border-t border-[var(--color-border)]" />
                                <button type="button" onClick={() => void handleDeleteDocument(doc.id)} disabled={deletingId === doc.id}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[var(--color-error)] hover:bg-[var(--color-bg-tertiary)]">
                                  <Trash2 className="size-3.5" /> {deletingId === doc.id ? "Deleting..." : "Delete"}
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Folder Modal */}
      <Modal open={showCreateFolder} onOpenChange={setShowCreateFolder} title="Create Folder">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleCreateFolder();
          }}
          className="space-y-4 p-4"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">Folder name</label>
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Enter folder name..."
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowCreateFolder(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={creatingFolder || !newFolderName.trim()}>
              {creatingFolder ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Rename Modal */}
      <Modal open={!!renameTarget} onOpenChange={() => setRenameTarget(null)} title={`Rename ${renameTarget?.type === "folder" ? "Folder" : "Document"}`}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleRename();
          }}
          className="space-y-4 p-4"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">Name</label>
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!renameValue.trim()}>
              Rename
            </Button>
          </div>
        </form>
      </Modal>

      {/* Move Document Modal */}
      <Modal open={!!moveTarget} onOpenChange={() => setMoveTarget(null)} title="Move Document">
        <div className="space-y-4 p-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Move &quot;{moveTarget?.title}&quot; to:
          </p>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            <button
              type="button"
              onClick={() => setMoveToFolderId(null)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                moveToFolderId === null
                  ? "bg-[var(--color-accent-primary)] text-white"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]"
              }`}
            >
              <Folder className="size-4" /> Root (no folder)
            </button>
            {folders.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setMoveToFolderId(f.id)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
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
            <Button type="button" variant="secondary" size="sm" onClick={() => setMoveTarget(null)}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={() => void handleMove()}>
              Move
            </Button>
          </div>
        </div>
      </Modal>

      {/* Share Document Modal */}
      <Modal open={!!shareDoc} onOpenChange={() => setShareDoc(null)} title="Share Document">
        <div className="space-y-4 p-4">
          <p className="truncate text-sm text-[var(--color-text-secondary)]">
            Manage access for &quot;{shareDoc?.title}&quot;
          </p>

          {shareLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="size-5 animate-spin text-[var(--color-text-tertiary)]" />
            </div>
          ) : (
            <>
              {/* Grant access form */}
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-[var(--color-text-tertiary)]">Add user</label>
                  <select
                    value={grantUserId}
                    onChange={(e) => setGrantUserId(e.target.value)}
                    className="w-full border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-primary)]"
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
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--color-text-tertiary)]">Access</label>
                  <select
                    value={grantLevel}
                    onChange={(e) => setGrantLevel(e.target.value as "viewer" | "editor")}
                    className="border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-primary)]"
                  >
                    <option value="viewer">View Only</option>
                    <option value="editor">Can Edit</option>
                  </select>
                </div>
                <Button type="button" size="sm" disabled={!grantUserId} onClick={() => void handleGrantAccess()}>
                  Grant
                </Button>
              </div>

              {/* Current access list */}
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                  People with access
                </h4>
                <div className="space-y-1">
                  {/* Owner */}
                  <div className="flex items-center gap-3 px-2 py-2">
                    <div className="flex size-8 items-center justify-center rounded-full bg-[var(--color-accent-primary)] text-xs font-bold text-white">
                      {shareDoc?.createdBy.firstName[0]}{shareDoc?.createdBy.lastName[0]}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">
                        {shareDoc?.createdBy.firstName} {shareDoc?.createdBy.lastName}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-[var(--color-accent-primary)]">Owner</span>
                  </div>

                  {shareAccessList.map((entry) => (
                    <div key={entry.user.id} className="flex items-center gap-3 px-2 py-2">
                      <div className="flex size-8 items-center justify-center rounded-full bg-[var(--color-bg-tertiary)] text-xs font-bold text-[var(--color-text-secondary)]">
                        {entry.user.firstName[0]}{entry.user.lastName[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                          {entry.user.firstName} {entry.user.lastName}
                        </p>
                        <p className="truncate text-xs text-[var(--color-text-tertiary)]">{entry.user.email}</p>
                      </div>
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        {entry.accessLevel === "editor" ? "Can Edit" : "View Only"}
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleRevokeAccess(entry.user.id)}
                        className="inline-flex size-6 items-center justify-center text-[var(--color-text-tertiary)] hover:text-[var(--color-error)]"
                        title="Revoke access"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}

                  {shareAccessList.length === 0 && (
                    <p className="py-3 text-center text-xs text-[var(--color-text-tertiary)]">
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
