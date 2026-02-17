"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type PreferenceState = {
  inAppAssigned: boolean;
  inAppMentioned: boolean;
  inAppCommented: boolean;
  inAppStatusChanged: boolean;
  emailAssigned: boolean;
  emailMentioned: boolean;
  emailDailyDigest: boolean;
};

const STORAGE_KEY = "kanban.notificationPreferences.v1";

const DEFAULT_PREFERENCES: PreferenceState = {
  inAppAssigned: true,
  inAppMentioned: true,
  inAppCommented: true,
  inAppStatusChanged: true,
  emailAssigned: true,
  emailMentioned: true,
  emailDailyDigest: false,
};

export function NotificationPreferencesForm() {
  const [preferences, setPreferences] = useState<PreferenceState>(DEFAULT_PREFERENCES);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as PreferenceState;
      setPreferences({
        ...DEFAULT_PREFERENCES,
        ...parsed,
      });
    } catch {
      setPreferences(DEFAULT_PREFERENCES);
    }
  }, []);

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    toast.success("Notification preferences saved");
  }

  function resetDefaults() {
    setPreferences(DEFAULT_PREFERENCES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PREFERENCES));
    toast.success("Notification preferences reset");
  }

  const enabledCount = Object.values(preferences).filter(Boolean).length;

  function ToggleRow({
    label,
    description,
    checked,
    onChange,
  }: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
  }) {
    return (
      <label className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2.5 text-sm text-[var(--color-text-primary)]">
        <span>
          <span className="block text-sm text-[var(--color-text-primary)]">{label}</span>
          <span className="block text-xs text-[var(--color-text-tertiary)]">{description}</span>
        </span>
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] accent-[var(--color-accent-primary)]"
        />
      </label>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-[var(--color-border)] bg-[linear-gradient(180deg,var(--color-bg-secondary),var(--color-bg-tertiary))] p-5">
        <h1 className="text-[24px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">Notification Preferences</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Control which updates reach you in-app and by email.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="border border-[var(--color-border)] bg-[rgba(0,0,0,0.18)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Enabled Rules</p>
            <p className="mt-1 text-xl font-semibold text-[var(--color-text-primary)]">{enabledCount}</p>
          </div>
          <div className="border border-[var(--color-border)] bg-[rgba(0,0,0,0.18)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">In-App</p>
            <p className="mt-1 text-xl font-semibold text-[var(--color-accent-primary)]">
              {[
                preferences.inAppAssigned,
                preferences.inAppMentioned,
                preferences.inAppCommented,
                preferences.inAppStatusChanged,
              ].filter(Boolean).length}
            </p>
          </div>
          <div className="border border-[var(--color-border)] bg-[rgba(0,0,0,0.18)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Email</p>
            <p className="mt-1 text-xl font-semibold text-[var(--color-text-primary)]">
              {[preferences.emailAssigned, preferences.emailMentioned, preferences.emailDailyDigest].filter(Boolean).length}
            </p>
          </div>
          <div className="border border-[var(--color-border)] bg-[rgba(0,0,0,0.18)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Storage</p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">Saved in browser profile.</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">In-App Notifications</h2>
          <div className="mt-3 space-y-2">
            <ToggleRow
              label="Issue assigned"
              description="Receive alert when you are assigned."
              checked={preferences.inAppAssigned}
              onChange={(checked) => setPreferences((current) => ({ ...current, inAppAssigned: checked }))}
            />
            <ToggleRow
              label="Mentioned in comment"
              description="Receive alert when someone mentions your account."
              checked={preferences.inAppMentioned}
              onChange={(checked) => setPreferences((current) => ({ ...current, inAppMentioned: checked }))}
            />
            <ToggleRow
              label="Watched issue comments"
              description="Receive alert when watched issues get comments."
              checked={preferences.inAppCommented}
              onChange={(checked) => setPreferences((current) => ({ ...current, inAppCommented: checked }))}
            />
            <ToggleRow
              label="Issue status changed"
              description="Receive alert when issue workflow state changes."
              checked={preferences.inAppStatusChanged}
              onChange={(checked) => setPreferences((current) => ({ ...current, inAppStatusChanged: checked }))}
            />
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Email Notifications</h2>
          <div className="mt-3 space-y-2">
            <ToggleRow
              label="Issue assigned email"
              description="Email alert for new assignments."
              checked={preferences.emailAssigned}
              onChange={(checked) => setPreferences((current) => ({ ...current, emailAssigned: checked }))}
            />
            <ToggleRow
              label="Mention email"
              description="Email alert when mentioned in discussion."
              checked={preferences.emailMentioned}
              onChange={(checked) => setPreferences((current) => ({ ...current, emailMentioned: checked }))}
            />
            <ToggleRow
              label="Daily digest"
              description="Daily summary of issue updates."
              checked={preferences.emailDailyDigest}
              onChange={(checked) => setPreferences((current) => ({ ...current, emailDailyDigest: checked }))}
            />
          </div>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <Button type="button" size="sm" onClick={save}>
          Save Preferences
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={resetDefaults}>
          Reset Defaults
        </Button>
      </div>
    </div>
  );
}
