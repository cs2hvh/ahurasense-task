import { NotificationPreferencesForm } from "@/components/profile/notification-preferences-form";
import { Card } from "@/components/ui/card";
import Link from "next/link";

export default function ProfileNotificationsPage() {
  return (
    <main className="space-y-4 p-6">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <NotificationPreferencesForm />

        <aside className="space-y-4">
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Delivery Notes</p>
            <ul className="mt-2 space-y-2 text-sm text-[var(--color-text-secondary)]">
              <li>In-app alerts appear in the top-right bell and notifications center.</li>
              <li>Email settings prepare for outbound provider integration.</li>
              <li>Use unread filters in notifications for faster triage.</li>
            </ul>
          </Card>

          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Quick Access</p>
            <div className="mt-3 space-y-2">
              <Link
                href="/notifications"
                className="block border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]"
              >
                Open Notifications Center
              </Link>
              <Link
                href="/profile"
                className="block border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]"
              >
                Return to Profile
              </Link>
            </div>
          </Card>
        </aside>
      </div>
    </main>
  );
}


