"use client";

import { UploadCloud } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* ─── Types ─── */

type UserProfile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: string;
  status: string;
  createdAt: string;
  phone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  bloodGroup: string | null;
  maritalStatus: string | null;
  nationality: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zipCode: string | null;
  employeeId: string | null;
  designation: string | null;
  department: string | null;
  employmentType: string | null;
  dateOfJoining: string | null;
  reportingManagerId: string | null;
  workLocation: string | null;
  linkedinUrl: string | null;
  bio: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankRoutingCode: string | null;
  bankHolderName: string | null;
  emergencyContactName: string | null;
  emergencyContactRelation: string | null;
  emergencyContactPhone: string | null;
  reportingManager: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  } | null;
};

type ManagerOption = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  designation: string | null;
  department: string | null;
};

type Res<T> = { data: T; error?: string };

type AccessLevel = "privileged" | "regular";

/* ─── Helpers ─── */

const ALL_TABS = [
  { key: "personal", label: "Personal" },
  { key: "employment", label: "Employment" },
  { key: "bank", label: "Bank & Tax" },
  { key: "emergency", label: "Emergency" },
  { key: "security", label: "Security" },
] as const;

type TabKey = (typeof ALL_TABS)[number]["key"];

function fmtDate(d: string | null) {
  if (!d) return "";
  return new Date(d).toISOString().split("T")[0];
}

function fmtLabel(v: string | null | undefined) {
  if (!v) return "—";
  return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ─── Tiny UI pieces ─── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <label className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-tertiary)]">{label}</label>
      {children}
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <Field label={label}>
      <div className="flex h-10 items-center border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 text-sm text-[var(--color-text-secondary)]">
        {value || "—"}
      </div>
    </Field>
  );
}

function Select({
  value,
  onChange,
  options,
  disabled,
  placeholder = "Select",
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <select
      className="h-10 w-full border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 text-sm text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

/* ─── Main Component ─── */

interface EmployeeProfileFormProps {
  /** When set, view/edit another user's profile (admin/owner only) */
  userId?: string;
}

export function EmployeeProfileForm({ userId }: EmployeeProfileFormProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [viewerRole, setViewerRole] = useState<string | null>(null);
  const [viewerIsWorkspaceOwner, setViewerIsWorkspaceOwner] = useState(false);
  const [tab, setTab] = useState<TabKey>("personal");
  const fileRef = useRef<HTMLInputElement>(null);

  const isViewingOther = !!userId;
  // Viewer is privileged if their system role is admin OR they are a workspace owner
  const isPrivileged = viewerRole === "admin" || viewerIsWorkspaceOwner;

  // Compute visible tabs based on context
  const visibleTabs = useMemo(() => {
    if (!isViewingOther) return ALL_TABS; // Own profile — all tabs
    if (isPrivileged) {
      // Admin/owner viewing other user: all except bank (bank stays hidden for others)
      return ALL_TABS;
    }
    // Regular user viewing other: only employment (public info)
    return ALL_TABS.filter((t) => t.key === "employment");
  }, [isViewingOther, isPrivileged]);

  // ── Personal state ──
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [nationality, setNationality] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [zipCode, setZipCode] = useState("");

  // ── Employment state ──
  const [employeeId, setEmployeeId] = useState("");
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [dateOfJoining, setDateOfJoining] = useState("");
  const [reportingManagerId, setReportingManagerId] = useState("");
  const [workLocation, setWorkLocation] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [bio, setBio] = useState("");

  // ── Bank state ──
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankRoutingCode, setBankRoutingCode] = useState("");
  const [bankHolderName, setBankHolderName] = useState("");

  // ── Emergency state ──
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactRelation, setEmergencyContactRelation] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");

  // ── Security state ──
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);

  // ── Manager search ──
  const [managerOptions, setManagerOptions] = useState<ManagerOption[]>([]);
  const [managerSearch, setManagerSearch] = useState("");
  const [showManagerDropdown, setShowManagerDropdown] = useState(false);
  const [selectedManagerName, setSelectedManagerName] = useState("");

  function hydrate(p: UserProfile) {
    setFirstName(p.firstName);
    setLastName(p.lastName);
    setEmail(p.email);
    setPhone(p.phone ?? "");
    setDateOfBirth(fmtDate(p.dateOfBirth));
    setGender(p.gender ?? "");
    setBloodGroup(p.bloodGroup ?? "");
    setMaritalStatus(p.maritalStatus ?? "");
    setNationality(p.nationality ?? "");
    setAddress(p.address ?? "");
    setCity(p.city ?? "");
    setState(p.state ?? "");
    setCountry(p.country ?? "");
    setZipCode(p.zipCode ?? "");
    setEmployeeId(p.employeeId ?? "");
    setDesignation(p.designation ?? "");
    setDepartment(p.department ?? "");
    setEmploymentType(p.employmentType ?? "");
    setDateOfJoining(fmtDate(p.dateOfJoining));
    setReportingManagerId(p.reportingManagerId ?? "");
    setWorkLocation(p.workLocation ?? "");
    setLinkedinUrl(p.linkedinUrl ?? "");
    setBio(p.bio ?? "");
    setBankName(p.bankName ?? "");
    setBankAccountNumber(p.bankAccountNumber ?? "");
    setBankRoutingCode(p.bankRoutingCode ?? "");
    setBankHolderName(p.bankHolderName ?? "");
    setEmergencyContactName(p.emergencyContactName ?? "");
    setEmergencyContactRelation(p.emergencyContactRelation ?? "");
    setEmergencyContactPhone(p.emergencyContactPhone ?? "");
    if (p.reportingManager) {
      setSelectedManagerName(`${p.reportingManager.firstName} ${p.reportingManager.lastName}`);
    } else {
      setSelectedManagerName("");
    }
  }

  useEffect(() => {
    (async () => {
      try {
        // Always fetch the current user to get viewer role
        const meRes = await fetch("/api/users/me");
        if (!meRes.ok) throw new Error("Failed to load profile");
        const { data: me } = (await meRes.json()) as Res<UserProfile & { isWorkspaceOwner?: boolean }>;
        setViewerRole(me.role);
        setViewerIsWorkspaceOwner(!!me.isWorkspaceOwner);

        if (userId) {
          // Viewing another user's profile
          const targetRes = await fetch(`/api/users/${userId}`);
          if (!targetRes.ok) throw new Error("Failed to load user profile");
          const { data: target } = (await targetRes.json()) as Res<UserProfile & { _accessLevel?: AccessLevel }>;
          setUser(target);
          hydrate(target);
          // If regular user, default to employment tab (only public tab)
          if (target._accessLevel !== "privileged") {
            setTab("employment");
          }
        } else {
          // Viewing own profile
          setUser(me);
          hydrate(me);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
    // userId is a prop that doesn't change after mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const searchManagers = useCallback(async (q: string) => {
    if (q.length < 2) { setManagerOptions([]); return; }
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const { data } = (await res.json()) as Res<ManagerOption[]>;
        setManagerOptions(data);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchManagers(managerSearch), 300);
    return () => clearTimeout(t);
  }, [managerSearch, searchManagers]);

  const initials = useMemo(() => {
    if (!user) return "U";
    return `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase() || "U";
  }, [user]);

  /* ── Save helper ── */
  async function save(section: string, data: Record<string, unknown>) {
    setSaving(true);
    try {
      const endpoint = userId ? `/api/users/${userId}` : "/api/users/me";
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const payload = (await res.json()) as Res<UserProfile>;
      if (!res.ok) throw new Error(payload.error ?? "Failed to save");
      setUser(payload.data);
      hydrate(payload.data);
      toast.success(`${section} updated`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  /* ── Avatar upload ── */
  async function uploadAvatar(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/uploads/avatar", { method: "POST", body: fd });
      const payload = (await res.json()) as Res<{ id: string; avatarUrl: string | null }>;
      if (!res.ok) throw new Error(payload.error ?? "Upload failed");
      setUser((u) => u ? { ...u, avatarUrl: payload.data.avatarUrl } : u);
      window.dispatchEvent(new CustomEvent("kanban:avatar-updated", { detail: { avatarUrl: payload.data.avatarUrl } }));
      toast.success("Avatar updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  /* ── Password change ── */
  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/users/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const payload = (await res.json()) as Res<{ success: boolean }>;
      if (!res.ok) throw new Error(payload.error ?? "Failed to change password");
      setCurrentPassword("");
      setNewPassword("");
      toast.success("Password changed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Password change failed");
    } finally {
      setSaving(false);
    }
  }

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-[var(--color-text-tertiary)]">
        Loading profile...
      </div>
    );
  }

  /* ─────────────────── RENDER ─────────────────── */

  return (
    <div className="flex h-full flex-col">
      {/* ─── Header banner ─── */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-6 py-5">
        <div className="flex flex-wrap items-center gap-5">
          {/* Avatar */}
          <div className="group relative shrink-0">
            <Avatar className="size-[72px] border-2 border-[var(--color-border)]">
              <AvatarImage src={user?.avatarUrl ?? undefined} alt={`${user?.firstName} ${user?.lastName}`} />
              <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <button
              type="button"
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={() => fileRef.current?.click()}
              disabled={uploading || isViewingOther}
            >
              <UploadCloud className="size-5 text-white" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadAvatar(f);
              }}
            />
          </div>

          {/* Name & meta */}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold text-[var(--color-text-primary)]">
              {user?.firstName} {user?.lastName}
            </h1>
            <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
              {user?.designation || "No designation"}{user?.department ? ` · ${user.department}` : ""}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-text-tertiary)]">
              <span>{user?.email}</span>
              {user?.employeeId && <span>ID: {user.employeeId}</span>}
              {user?.phone && <span>{user.phone}</span>}
              {user?.workLocation && <span>{user.workLocation}</span>}
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex h-7 items-center gap-1.5 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2.5 text-xs text-[var(--color-text-secondary)]">
              <span className="inline-block size-1.5 rounded-full bg-blue-500" />
              {fmtLabel(user?.role)}
            </span>
            <span className="inline-flex h-7 items-center gap-1.5 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2.5 text-xs text-[var(--color-text-secondary)]">
              <span className={`inline-block size-1.5 rounded-full ${user?.status === "active" ? "bg-emerald-500" : "bg-neutral-500"}`} />
              {fmtLabel(user?.status)}
            </span>
            {user?.employmentType && (
              <span className="inline-flex h-7 items-center border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2.5 text-xs text-[var(--color-text-secondary)]">
                {fmtLabel(user.employmentType)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─── Tab bar ─── */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
        <nav className="flex gap-0 overflow-x-auto px-6" aria-label="Profile sections">
          {visibleTabs.filter((t) => {
            // Hide bank tab when viewing another user's profile (even for admin)
            if (t.key === "bank" && isViewingOther) return false;
            // Hide security tab for regular users viewing others; show for admin/owner to reset password
            if (t.key === "security" && isViewingOther && !isPrivileged) return false;
            return true;
          }).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`relative whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${
                tab === t.key
                  ? "text-[var(--color-accent-primary)]"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {t.label}
              {tab === t.key && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[var(--color-accent-primary)]" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* ─── Tab content ─── */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* ───────── PERSONAL TAB ───────── */}
        {tab === "personal" && (
          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              if (isPrivileged) {
                void save("Personal information", {
                  firstName, lastName, email,
                  phone: phone || null,
                  dateOfBirth: dateOfBirth || null,
                  gender: gender || null,
                  bloodGroup: bloodGroup || null,
                  maritalStatus: maritalStatus || null,
                  nationality: nationality || null,
                  address: address || null,
                  city: city || null,
                  state: state || null,
                  country: country || null,
                  zipCode: zipCode || null,
                });
              }
            }}
          >
            {/* Account */}
            <section>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">Account</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {isPrivileged ? (
                  <>
                    <Field label="First Name">
                      <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={saving} />
                    </Field>
                    <Field label="Last Name">
                      <Input value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={saving} />
                    </Field>
                    <Field label="Email">
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={saving} />
                    </Field>
                  </>
                ) : (
                  <>
                    <ReadOnly label="First Name" value={user?.firstName} />
                    <ReadOnly label="Last Name" value={user?.lastName} />
                    <ReadOnly label="Email" value={user?.email} />
                  </>
                )}
              </div>
            </section>

            {/* Contact & Identity */}
            <section>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">Contact & Identity</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {isPrivileged ? (
                  <>
                    <Field label="Phone">
                      <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 9876543210" disabled={saving} />
                    </Field>
                    <Field label="Date of Birth">
                      <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} disabled={saving} />
                    </Field>
                    <Field label="Gender">
                      <Select
                        value={gender}
                        onChange={setGender}
                        disabled={saving}
                        options={[
                          { value: "male", label: "Male" },
                          { value: "female", label: "Female" },
                          { value: "other", label: "Other" },
                          { value: "prefer_not_to_say", label: "Prefer not to say" },
                        ]}
                      />
                    </Field>
                    <Field label="Blood Group">
                      <Select
                        value={bloodGroup}
                        onChange={setBloodGroup}
                        disabled={saving}
                        options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((v) => ({ value: v, label: v }))}
                      />
                    </Field>
                  </>
                ) : (
                  <>
                    <ReadOnly label="Phone" value={user?.phone} />
                    <ReadOnly label="Date of Birth" value={user?.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : null} />
                    <ReadOnly label="Gender" value={fmtLabel(user?.gender)} />
                    <ReadOnly label="Blood Group" value={user?.bloodGroup} />
                  </>
                )}
              </div>
              {isPrivileged ? (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Marital Status">
                    <Select
                      value={maritalStatus}
                      onChange={setMaritalStatus}
                      disabled={saving}
                      options={[
                        { value: "single", label: "Single" },
                        { value: "married", label: "Married" },
                        { value: "divorced", label: "Divorced" },
                        { value: "widowed", label: "Widowed" },
                        { value: "prefer_not_to_say", label: "Prefer not to say" },
                      ]}
                    />
                  </Field>
                  <Field label="Nationality">
                    <Input value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder="Indian" disabled={saving} />
                  </Field>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <ReadOnly label="Marital Status" value={fmtLabel(user?.maritalStatus)} />
                  <ReadOnly label="Nationality" value={user?.nationality} />
                </div>
              )}
            </section>

            {/* Address */}
            <section>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">Address</h3>
              {isPrivileged ? (
                <div className="grid gap-4">
                  <Field label="Street Address">
                    <textarea
                      className="min-h-[60px] w-full resize-y border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Street, apartment, building..."
                      disabled={saving}
                    />
                  </Field>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Field label="City">
                      <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Mumbai" disabled={saving} />
                    </Field>
                    <Field label="State">
                      <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="Maharashtra" disabled={saving} />
                    </Field>
                    <Field label="Country">
                      <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="India" disabled={saving} />
                    </Field>
                    <Field label="Zip Code">
                      <Input value={zipCode} onChange={(e) => setZipCode(e.target.value)} placeholder="400001" disabled={saving} />
                    </Field>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4">
                  <ReadOnly label="Street Address" value={user?.address} />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <ReadOnly label="City" value={user?.city} />
                    <ReadOnly label="State" value={user?.state} />
                    <ReadOnly label="Country" value={user?.country} />
                    <ReadOnly label="Zip Code" value={user?.zipCode} />
                  </div>
                </div>
              )}
            </section>

            {isPrivileged && (
              <div className="border-t border-[var(--color-border)] pt-4">
                <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Personal Details"}</Button>
              </div>
            )}
          </form>
        )}

        {/* ───────── EMPLOYMENT TAB ───────── */}
        {tab === "employment" && (
          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              if (!isPrivileged) {
                void save("Profile", {
                  linkedinUrl: linkedinUrl || null,
                  bio: bio || null,
                });
              } else {
                void save("Employment details", {
                  employeeId: employeeId || null,
                  designation: designation || null,
                  department: department || null,
                  employmentType: employmentType || null,
                  dateOfJoining: dateOfJoining || null,
                  reportingManagerId: reportingManagerId || null,
                  workLocation: workLocation || null,
                  linkedinUrl: linkedinUrl || null,
                  bio: bio || null,
                });
              }
            }}
          >
            <section>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">Organization</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {isPrivileged ? (
                  <>
                    <Field label="Employee ID">
                      <Input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="EMP-001" disabled={saving} />
                    </Field>
                    <Field label="Designation">
                      <Input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="Senior Software Engineer" disabled={saving} />
                    </Field>
                    <Field label="Department">
                      <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Engineering" disabled={saving} />
                    </Field>
                  </>
                ) : (
                  <>
                    <ReadOnly label="Employee ID" value={user?.employeeId} />
                    <ReadOnly label="Designation" value={user?.designation} />
                    <ReadOnly label="Department" value={user?.department} />
                  </>
                )}
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {isPrivileged ? (
                  <>
                    <Field label="Employment Type">
                      <Select
                        value={employmentType}
                        onChange={setEmploymentType}
                        disabled={saving}
                        options={[
                          { value: "full_time", label: "Full Time" },
                          { value: "part_time", label: "Part Time" },
                          { value: "contract", label: "Contract" },
                          { value: "intern", label: "Intern" },
                          { value: "freelance", label: "Freelance" },
                        ]}
                      />
                    </Field>
                    <Field label="Date of Joining">
                      <Input type="date" value={dateOfJoining} onChange={(e) => setDateOfJoining(e.target.value)} disabled={saving} />
                    </Field>
                    <Field label="Work Location">
                      <Input value={workLocation} onChange={(e) => setWorkLocation(e.target.value)} placeholder="Mumbai Office / Remote" disabled={saving} />
                    </Field>
                  </>
                ) : (
                  <>
                    <ReadOnly label="Employment Type" value={fmtLabel(user?.employmentType)} />
                    <ReadOnly label="Date of Joining" value={user?.dateOfJoining ? new Date(user.dateOfJoining).toLocaleDateString() : null} />
                    <ReadOnly label="Work Location" value={user?.workLocation} />
                  </>
                )}
              </div>
            </section>

            {/* Reporting Manager */}
            <section>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">Reporting Manager</h3>
              {isPrivileged ? (
                <div className="max-w-md">
                  <div className="relative">
                    <Field label="Search Manager">
                      <Input
                        value={managerSearch || selectedManagerName}
                        onChange={(e) => {
                          setManagerSearch(e.target.value);
                          setShowManagerDropdown(true);
                          if (!e.target.value) { setReportingManagerId(""); setSelectedManagerName(""); }
                        }}
                        onFocus={() => { if (managerSearch.length >= 2) setShowManagerDropdown(true); }}
                        placeholder="Search by name or email..."
                        disabled={saving}
                      />
                    </Field>
                    {showManagerDropdown && managerOptions.length > 0 && (
                      <div className="absolute left-0 top-full z-50 mt-1 max-h-48 w-full overflow-auto border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-lg">
                        {managerOptions.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-[var(--color-bg-tertiary)]"
                            onClick={() => {
                              setReportingManagerId(m.id);
                              setSelectedManagerName(`${m.firstName} ${m.lastName}`);
                              setManagerSearch("");
                              setShowManagerDropdown(false);
                            }}
                          >
                            <div className="flex size-7 items-center justify-center rounded-full bg-[var(--color-accent-primary)] text-[10px] font-bold text-white">
                              {m.firstName[0]}{m.lastName[0]}
                            </div>
                            <div>
                              <p className="text-[var(--color-text-primary)]">{m.firstName} {m.lastName}</p>
                              <p className="text-xs text-[var(--color-text-tertiary)]">{m.designation || m.email}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {reportingManagerId && (
                    <button
                      type="button"
                      className="mt-1.5 text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-error)]"
                      onClick={() => { setReportingManagerId(""); setSelectedManagerName(""); setManagerSearch(""); }}
                    >
                      Remove manager
                    </button>
                  )}
                </div>
              ) : (
                <div className="max-w-md">
                  {user?.reportingManager ? (
                    <div className="flex items-center gap-3 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-4 py-3">
                      <div className="flex size-9 items-center justify-center rounded-full bg-[var(--color-accent-primary)] text-xs font-bold text-white">
                        {user.reportingManager.firstName[0]}{user.reportingManager.lastName[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">
                          {user.reportingManager.firstName} {user.reportingManager.lastName}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--color-text-tertiary)]">No reporting manager assigned.</p>
                  )}
                </div>
              )}
            </section>

            {/* Bio & LinkedIn (editable by all) */}
            <section>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">About</h3>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Field label="LinkedIn">
                  <Input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/username" disabled={saving} />
                </Field>
                <Field label="Bio">
                  <textarea
                    className="min-h-[60px] w-full resize-y border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Short bio about yourself..."
                    disabled={saving}
                    maxLength={1000}
                  />
                </Field>
              </div>
            </section>

            <div className="border-t border-[var(--color-border)] pt-4">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : isPrivileged ? "Save Employment Details" : "Save Profile"}
              </Button>
            </div>
          </form>
        )}

        {/* ───────── BANK & TAX TAB ───────── */}
        {tab === "bank" && (
          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              void save("Bank details", {
                bankName: bankName || null,
                bankAccountNumber: bankAccountNumber || null,
                bankRoutingCode: bankRoutingCode || null,
                bankHolderName: bankHolderName || null,
              });
            }}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Account Holder Name">
                <Input value={bankHolderName} onChange={(e) => setBankHolderName(e.target.value)} placeholder="Full name as per bank" disabled={saving} />
              </Field>
              <Field label="Bank Name">
                <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="State Bank of India" disabled={saving} />
              </Field>
              <Field label="Account Number">
                <Input value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} placeholder="XXXX XXXX XXXX" disabled={saving} />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="IFSC / Routing Code">
                <Input value={bankRoutingCode} onChange={(e) => setBankRoutingCode(e.target.value)} placeholder="SBIN0001234" disabled={saving} />
              </Field>
            </div>

            <div className="border-t border-[var(--color-border)] pt-4">
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Bank Details"}</Button>
            </div>
          </form>
        )}

        {/* ───────── EMERGENCY TAB ───────── */}
        {tab === "emergency" && (
          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              void save("Emergency contact", {
                emergencyContactName: emergencyContactName || null,
                emergencyContactRelation: emergencyContactRelation || null,
                emergencyContactPhone: emergencyContactPhone || null,
              });
            }}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Contact Name">
                <Input value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)} placeholder="Full name" disabled={saving} />
              </Field>
              <Field label="Relationship">
                <Input value={emergencyContactRelation} onChange={(e) => setEmergencyContactRelation(e.target.value)} placeholder="Spouse, Parent, Sibling..." disabled={saving} />
              </Field>
              <Field label="Phone Number">
                <Input value={emergencyContactPhone} onChange={(e) => setEmergencyContactPhone(e.target.value)} placeholder="+91 9876543210" disabled={saving} />
              </Field>
            </div>

            <div className="border-t border-[var(--color-border)] pt-4">
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Emergency Contact"}</Button>
            </div>
          </form>
        )}

        {/* ───────── SECURITY TAB ───────── */}
        {tab === "security" && (
          <div className="space-y-6">
            {/* Own password change (only when viewing own profile) */}
            {!isViewingOther && (
              <form className="max-w-md space-y-4" onSubmit={changePassword}>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">Change Password</h3>
                <Field label="Current Password">
                  <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} disabled={saving} />
                </Field>
                <Field label="New Password">
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={saving} />
                </Field>
                <div className="text-xs text-[var(--color-text-tertiary)]">
                  Minimum 12 characters with at least one uppercase, one lowercase, and one number.
                </div>
                <Button type="submit" disabled={saving}>{saving ? "Updating..." : "Change Password"}</Button>
              </form>
            )}

            {/* Admin/owner password reset for another employee */}
            {isViewingOther && isPrivileged && (
              <form className="max-w-md space-y-4" onSubmit={async (e) => {
                e.preventDefault();
                setResettingPassword(true);
                try {
                  const res = await fetch(`/api/users/${userId}/password`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ newPassword: resetPassword }),
                  });
                  const payload = (await res.json()) as Res<{ success: boolean }>;
                  if (!res.ok) throw new Error(payload.error ?? "Failed to reset password");
                  setResetPassword("");
                  toast.success("Employee password has been reset");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Password reset failed");
                } finally {
                  setResettingPassword(false);
                }
              }}>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">Reset Employee Password</h3>
                <div className="flex items-center gap-2 border border-yellow-500/20 bg-yellow-500/5 px-4 py-2.5 text-xs text-yellow-200">
                  <svg className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v.01M12 9v3m0 8a9 9 0 100-18 9 9 0 000 18z" /></svg>
                  This will immediately change the employee&apos;s password. They will need to use the new password on their next login.
                </div>
                <Field label="New Password">
                  <Input type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} disabled={resettingPassword} />
                </Field>
                <div className="text-xs text-[var(--color-text-tertiary)]">
                  Minimum 12 characters with at least one uppercase, one lowercase, and one number.
                </div>
                <Button type="submit" disabled={resettingPassword || resetPassword.length < 12}>{resettingPassword ? "Resetting..." : "Reset Password"}</Button>
              </form>
            )}

            <div className="border-t border-[var(--color-border)] pt-6">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">Account Information</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <ReadOnly label="System Role" value={fmtLabel(user?.role)} />
                <ReadOnly label="Account Status" value={fmtLabel(user?.status)} />
                <ReadOnly label="Account Created" value={user ? new Date(user.createdAt).toLocaleDateString() : null} />
                <ReadOnly label="Email" value={user?.email} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
