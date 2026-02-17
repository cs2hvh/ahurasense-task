import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getAuthSession } from "@/lib/session";

export default async function HomePage() {
  const session = await getAuthSession();

  if (session?.user?.id) {
    redirect("/workspaces");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--color-bg-primary)] px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,102,255,0.15),transparent_30%),radial-gradient(circle_at_80%_70%,rgba(0,101,255,0.08),transparent_30%)]" />
      <section className="relative w-full max-w-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-8 shadow-[var(--shadow-lg)]">
        <p className="mb-3 text-xs uppercase tracking-[0.2em] text-[var(--color-text-tertiary)]">Ahurasense Project Management</p>
        <h1 className="mb-4 text-[32px] font-bold tracking-[-0.02em] text-[var(--color-text-primary)]">
          Jira-style workflow control for high-scale teams
        </h1>
        <p className="mb-6 max-w-xl text-sm text-[var(--color-text-secondary)]">
          Manage workspaces, projects, issues, sprints, and team collaboration with fast board interactions and hardened access controls.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/auth/login">
            <Button size="lg">Sign In</Button>
          </Link>
          <span className="inline-flex items-center text-sm text-[var(--color-text-secondary)]">
            User accounts are created by workspace admins.
          </span>
        </div>
      </section>
    </main>
  );
}


