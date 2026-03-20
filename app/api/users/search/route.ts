import { NextRequest } from "next/server";

import { requireUser } from "@/lib/api-auth";
import { handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  try {
    const q = request.nextUrl.searchParams.get("q") ?? "";

    const users = await prisma.user.findMany({
      where: {
        status: "active",
        id: { not: auth.session.user.id },
        ...(q
          ? {
              OR: [
                { firstName: { contains: q } },
                { lastName: { contains: q } },
                { email: { contains: q } },
                { employeeId: { contains: q } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        avatarUrl: true,
        designation: true,
        department: true,
      },
      take: 20,
      orderBy: { firstName: "asc" },
    });

    return ok(users);
  } catch (error) {
    return handleRouteError(error);
  }
}
