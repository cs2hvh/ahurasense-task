import Link from "next/link";

import { Card } from "@/components/ui/card";

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md space-y-4 p-6">
        <h1 className="text-[24px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">Reset Password</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">Token verification and password reset form can be added here.</p>
        <Link href="/auth/login" className="text-sm text-[var(--color-accent-primary)] hover:text-[var(--color-accent-hover)]">
          Back to login
        </Link>
      </Card>
    </main>
  );
}


