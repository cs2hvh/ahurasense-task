import { z } from "zod";

export const createDocumentSchema = z.object({
  title: z.string().min(1, "Title is required").max(300),
  fileKey: z.string().min(3).max(1024),
  fileUrl: z.string().min(1),
  fileSize: z.number().int().positive().max(50 * 1024 * 1024),
  mimeType: z.string().min(1).max(100),
  folderId: z.string().uuid().optional().nullable(),
  issueId: z.string().uuid().optional().nullable(),
});

export const updateDocumentSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  folderId: z.string().uuid().nullable().optional(),
});

export const createFolderSchema = z.object({
  name: z.string().min(1, "Folder name is required").max(200),
  parentId: z.string().uuid().nullable().optional(),
});

export const updateFolderSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  parentId: z.string().uuid().nullable().optional(),
});

export const grantAccessSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  accessLevel: z.enum(["viewer", "editor"]),
});

export const revokeAccessSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
});

export const DOCUMENT_MIME_TYPES = [
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const PRESENTATION_MIME_TYPES = [
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
] as const;

export const SPREADSHEET_MIME_TYPES = [
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

export const PDF_MIME_TYPES = [
  "application/pdf",
] as const;

export const TEXT_MIME_TYPES = [
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/html",
  "text/css",
  "text/javascript",
  "application/json",
  "application/xml",
  "text/xml",
] as const;

export const ALL_DOCUMENT_MIME_TYPES = [
  ...DOCUMENT_MIME_TYPES,
  ...PRESENTATION_MIME_TYPES,
  ...SPREADSHEET_MIME_TYPES,
  ...PDF_MIME_TYPES,
  ...TEXT_MIME_TYPES,
] as const;

export const DOCUMENT_MAX_SIZE = 50 * 1024 * 1024; // 50MB

export function isPresentationMime(mimeType: string): boolean {
  return (PRESENTATION_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function isWordMime(mimeType: string): boolean {
  return (DOCUMENT_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function isSpreadsheetMime(mimeType: string): boolean {
  return (SPREADSHEET_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function isPdfMime(mimeType: string): boolean {
  return (PDF_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function isTextMime(mimeType: string): boolean {
  return (TEXT_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function validateDocumentUpload(contentType: string, fileSize: number) {
  if (!(ALL_DOCUMENT_MIME_TYPES as readonly string[]).includes(contentType)) {
    throw new Error("Only Word, PowerPoint, Excel, PDF, and text files are supported");
  }

  if (fileSize > DOCUMENT_MAX_SIZE) {
    throw new Error("Document file size must be 50MB or less");
  }
}
