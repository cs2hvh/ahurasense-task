import { AvatarUploadCard } from "@/components/profile/avatar-upload-card";
import { PasswordChangeForm } from "@/components/profile/password-change-form";
import { ProfileSettingsForm } from "@/components/profile/profile-settings-form";
import { Card } from "@/components/ui/card";
import Link from "next/link";

export default function ProfilePage() {
  return (
    <main className="space-y-4 p-6">
      <Card className="border-[var(--color-border)] bg-[linear-gradient(180deg,var(--color-bg-secondary),var(--color-bg-tertiary))] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[24px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">Profile Settings</h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Manage your account identity, security credentials, and avatar.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/profile/notifications"
              className="inline-flex h-9 items-center border border-[var(--color-border)] px-3 text-sm hover:bg-[var(--color-bg-tertiary)]"
            >
              Notification Preferences
            </Link>
            <Link
              href="/notifications"
              className="inline-flex h-9 items-center border border-[var(--color-border)] px-3 text-sm hover:bg-[var(--color-bg-tertiary)]"
            >
              Open Notifications
            </Link>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <ProfileSettingsForm />
          <AvatarUploadCard />
          <PasswordChangeForm />
        </div>

        <aside className="space-y-4">
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Account Guidance</p>
            <ul className="mt-2 space-y-2 text-sm text-[var(--color-text-secondary)]">
              <li>Use work email for workspace-level visibility and invites.</li>
              <li>Change password periodically if using shared devices.</li>
              <li>Update avatar for faster assignee identification on boards.</li>
            </ul>
          </Card>

          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Session Notes</p>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              Profile updates are immediate. Name/email shown in existing sessions can refresh after sign out/sign in.
            </p>
          </Card>
        </aside>
      </div>
    </main>
  );
}


