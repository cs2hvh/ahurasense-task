import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: string;
      firstName: string;
      lastName: string;
      avatarUrl?: string | null;
    };
  }

  interface User {
    id: string;
    role: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string | null;
  }
}

