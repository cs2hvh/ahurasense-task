import { NextRequest } from "next/server";

import { requireUser } from "@/lib/api-auth";
import { handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { getPublicObjectUrl } from "@/lib/storage";
import { updateAvatarSchema } from "@/lib/validations/upload";

export async function PATCH(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const payload = updateAvatarSchema.parse(await request.json());

    const user = await prisma.user.update({
      where: { id: auth.session.user.id },
      data: {
        avatarUrl: getPublicObjectUrl(payload.key),
      },
      select: {
        id: true,
        avatarUrl: true,
      },
    });

    return ok(user);
  } catch (error) {
    return handleRouteError(error);
  }
}


