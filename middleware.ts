import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { getAuthSecret, hasAuthSecret } from "@/lib/auth-env";
import { AUTH_ROUTES, PROTECTED_ROUTE_PREFIXES, PUBLIC_FILE } from "@/lib/constants";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  const secretConfigured = hasAuthSecret();
  const authSecret = getAuthSecret();
  const secureCookie = request.nextUrl.protocol === "https:" || process.env.VERCEL === "1";

  const token = secretConfigured
    ? await getToken({ req: request, secret: authSecret, secureCookie })
    : null;
  const isAuthenticated = Boolean(token?.sub);
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
  const isProtectedRoute = PROTECTED_ROUTE_PREFIXES.some((route) => pathname.startsWith(route));

  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/workspaces", request.url));
  }

  if (!secretConfigured) {
    return NextResponse.next();
  }

  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};


