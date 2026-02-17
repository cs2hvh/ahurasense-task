"use client";

import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type ApiResponse<T> = {
  data: T;
  error?: string;
};

export function IssueAttachmentUpload({ issueId }: { issueId: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function uploadAttachment(file: File) {
    setUploading(true);
    try {
      const presignResponse = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "attachment",
          issueId,
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
        }),
      });

      const presignPayload = (await presignResponse.json()) as ApiResponse<{
        key: string;
        uploadUrl: string;
      }>;

      if (!presignResponse.ok) {
        throw new Error(presignPayload.error ?? "Failed to initialize attachment upload");
      }

      const uploadResponse = await fetch(presignPayload.data.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload attachment binary");
      }

      const completeResponse = await fetch(`/api/issues/${issueId}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: presignPayload.data.key,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        }),
      });

      const completePayload = (await completeResponse.json()) as ApiResponse<{ id: string }>;
      if (!completeResponse.ok) {
        throw new Error(completePayload.error ?? "Failed to save attachment metadata");
      }

      toast.success("Attachment uploaded");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload attachment");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  return (
    <div className="mb-3">
      <input
        ref={fileInputRef}
        id={`attachment-upload-${issueId}`}
        type="file"
        disabled={uploading}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void uploadAttachment(file);
          }
        }}
      />
      <label htmlFor={`attachment-upload-${issueId}`}>
        <Button type="button" variant="secondary" size="sm" disabled={uploading} className="cursor-pointer">
          <Upload className="mr-1 size-4" />
          {uploading ? "Uploading..." : "Upload Attachment"}
        </Button>
      </label>
    </div>
  );
}

