import { NextRequest } from "next/server";

import { requireUser } from "@/lib/api-auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { updateProfileSchema } from "@/lib/validations/user";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.session.user.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  return ok(user);
}

export async function PATCH(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const payload = updateProfileSchema.parse(await request.json());
    const normalizedEmail = payload.email?.toLowerCase();

    if (normalizedEmail) {
      const existing = await prisma.user.findFirst({
        where: {
          email: normalizedEmail,
          id: { not: auth.session.user.id },
        },
        select: { id: true },
      });
      if (existing) {
        return fail("Email is already in use", 409);
      }
    }

    const updated = await prisma.user.update({
      where: { id: auth.session.user.id },
      data: {
        ...(payload.firstName !== undefined ? { firstName: payload.firstName } : {}),
        ...(payload.lastName !== undefined ? { lastName: payload.lastName } : {}),
        ...(normalizedEmail !== undefined ? { email: normalizedEmail } : {}),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    return ok(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}


