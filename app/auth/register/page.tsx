import Link from "next/link";

import { Card } from "@/components/ui/card";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg-primary)] px-4 py-8">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-[24px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">Registration Disabled</h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          New user sign-up is disabled. Ask your workspace admin to create your account from Members settings.
        </p>
        <Link
          href="/auth/login"
          className="mt-4 inline-flex h-9 items-center border border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)]"
        >
          Back to Login
        </Link>
      </Card>
    </main>
  );
}


