import { requireUser } from "@/lib/api-auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { buildObjectKey, uploadObject } from "@/lib/storage";
import { validateUploadRules } from "@/lib/validations/upload";

const EXTENSION_TO_CONTENT_TYPE: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

function getContentType(fileName: string, explicitType: string | null) {
  if (explicitType && explicitType.trim()) {
    return explicitType;
  }

  const lowerName = fileName.toLowerCase();
  const matched = Object.entries(EXTENSION_TO_CONTENT_TYPE).find(([extension]) =>
    lowerName.endsWith(extension),
  );

  return matched?.[1] ?? "application/octet-stream";
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const formData = await request.formData();
    const fileValue = formData.get("file");

    if (!(fileValue instanceof File)) {
      return fail("Avatar file is required", 400);
    }

    const contentType = getContentType(fileValue.name, fileValue.type);
    validateUploadRules("avatar", contentType, fileValue.size);

    const key = buildObjectKey({
      scope: "avatar",
      userId: auth.session.user.id,
      originalFileName: fileValue.name,
    });

    const bytes = Buffer.from(await fileValue.arrayBuffer());
    const uploaded = await uploadObject({
      key,
      contentType,
      body: bytes,
    });

    const user = await prisma.user.update({
      where: { id: auth.session.user.id },
      data: { avatarUrl: uploaded.fileUrl },
      select: {
        id: true,
        avatarUrl: true,
      },
    });

    return ok(user, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
