import { z } from "zod";

const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];
const FILE_MIME_TYPES = [
  ...IMAGE_MIME_TYPES,
  "application/pdf",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export const createUploadUrlSchema = z.object({
  scope: z.enum(["avatar", "attachment"]),
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1).max(100),
  fileSize: z.number().int().positive().max(25 * 1024 * 1024),
  issueId: z.string().uuid().optional(),
});

export const completeAttachmentSchema = z.object({
  key: z.string().min(3).max(1024),
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().positive().max(25 * 1024 * 1024),
  mimeType: z.string().min(1).max(100),
});

export const updateAvatarSchema = z.object({
  key: z.string().min(3).max(1024),
});

export function validateUploadRules(scope: "avatar" | "attachment", contentType: string, fileSize: number) {
  if (scope === "avatar") {
    if (!IMAGE_MIME_TYPES.includes(contentType)) {
      throw new Error("Avatar must be an image file");
    }

    if (fileSize > 5 * 1024 * 1024) {
      throw new Error("Avatar file size must be 5MB or less");
    }

    return;
  }

  if (!FILE_MIME_TYPES.includes(contentType)) {
    throw new Error("File type is not supported for attachments");
  }

  if (fileSize > 25 * 1024 * 1024) {
    throw new Error("Attachment file size must be 25MB or less");
  }
}


