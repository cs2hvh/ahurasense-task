import Link from "next/link";

import { Card } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md space-y-4 p-6">
        <h1 className="text-[24px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">Forgot Password</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">Password reset workflow endpoint is reserved in this scaffold.</p>
        <Link href="/auth/login" className="text-sm text-[var(--color-accent-primary)] hover:text-[var(--color-accent-hover)]">
          Back to login
        </Link>
      </Card>
    </main>
  );
}


