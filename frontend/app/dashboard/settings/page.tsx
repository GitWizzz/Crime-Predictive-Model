"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CheckCircle2,
  Copy,
  Lock,
  LogOut,
  Mail,
  MoonStar,
  MonitorCog,
  Shield,
  Smartphone,
  SunMedium,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/services/api";

type Profile = {
  id: number;
  name: string;
  email: string;
  role: string;
  policeStation?: string | null;
  police_station?: string | null;
  zone?: string | null;
  last_login_at?: string | null;
  lastLoginAt?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
};

type Preferences = {
  themePreference: "light" | "dark" | "system";
  emailAlerts: boolean;
  anomalyAlerts: boolean;
  patrolBriefing: boolean;
  compactTables: boolean;
};

const PREFS_KEY = "accountPreferences";

const defaultPrefs: Preferences = {
  themePreference: "system",
  emailAlerts: true,
  anomalyAlerts: true,
  patrolBriefing: false,
  compactTables: false,
};

const formatDate = (value?: string | null) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const roleTone = (role: string) => {
  if (role === "ADMIN") return "bg-[var(--risk-high-bg)] text-[var(--risk-high)]";
  if (role === "ANALYST") return "bg-[var(--accent-50)] text-[var(--accent-700)]";
  return "bg-[var(--risk-low-bg)] text-[var(--risk-low)]";
};

function SettingToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[20px] border bg-[var(--bg-subtle)] px-4 py-4">
      <div>
        <p className="text-sm font-semibold text-[var(--fg-primary)]">{label}</p>
        <p className="mt-1 text-sm text-[var(--fg-secondary)]">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative mt-1 h-7 w-12 shrink-0 rounded-full transition ${
          checked ? "bg-[var(--accent-500)]" : "bg-[var(--bg-muted)]"
        }`}
        aria-pressed={checked}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-[var(--shadow-xs)] transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [prefs, setPrefs] = useState<Preferences>(defaultPrefs);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setToken(window.localStorage.getItem("authToken"));

    try {
      const storedUser = window.localStorage.getItem("authUser");
      if (storedUser) {
        setProfile(JSON.parse(storedUser) as Profile);
      }
    } catch {}

    try {
      const storedPrefs = window.localStorage.getItem(PREFS_KEY);
      if (storedPrefs) {
        setPrefs({ ...defaultPrefs, ...(JSON.parse(storedPrefs) as Partial<Preferences>) });
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const loadProfile = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await apiGet("/api/auth/profile", token);
        const nextProfile = (res.data || null) as Profile | null;
        setProfile(nextProfile);
        if (nextProfile && typeof window !== "undefined") {
          window.localStorage.setItem("authUser", JSON.stringify(nextProfile));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load account profile.");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [token]);

  const initials = useMemo(() => {
    const source = profile?.name?.trim() || "Officer";
    return source
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("");
  }, [profile?.name]);

  const policeStation = profile?.policeStation || profile?.police_station || "Not assigned";
  const zone = profile?.zone || "Not assigned";
  const lastLogin = profile?.lastLoginAt || profile?.last_login_at || null;
  const createdAt = profile?.createdAt || profile?.created_at || null;

  const handleSavePreferences = () => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    if (saved) {
      setSaved(false);
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const handleCopyEmail = async () => {
    if (!profile?.email || typeof navigator === "undefined" || !navigator.clipboard) return;
    await navigator.clipboard.writeText(profile.email);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("authToken");
      window.localStorage.removeItem("authUser");
    }
    router.push("/landing_page");
  };

  return (
    <div className="mx-auto max-w-[1320px] space-y-6">
      <section className="surface-card-strong rounded-[30px] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--fg-tertiary)]">
          Account
        </p>
        <h2 className="mt-2 text-[30px] font-semibold tracking-[-0.03em] text-[var(--fg-primary)]">
          Profile and account settings
        </h2>
        <p className="mt-3 max-w-3xl text-[15px] leading-7 text-[var(--fg-secondary)]">
          Review your identity, security posture, notification behaviour, and local dashboard
          preferences from one place.
        </p>
      </section>

      {error ? (
        <div className="rounded-[22px] border border-[var(--risk-high)]/20 bg-[var(--risk-high-bg)] px-4 py-3 text-sm text-[var(--risk-high)]">
          {error}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-6">
          <div className="surface-card rounded-[28px] p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[var(--accent-50)] text-lg font-semibold text-[var(--accent-700)]">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[24px] font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">
                    {loading ? "Loading..." : profile?.name || "User"}
                  </h3>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      roleTone(profile?.role || "OFFICER")
                    }`}
                  >
                    {profile?.role || "OFFICER"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[var(--fg-secondary)]">
                  {profile?.email || "No email available"}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[18px] border bg-[var(--bg-subtle)] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--fg-tertiary)]">
                      Assigned station
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--fg-primary)]">
                      {policeStation}
                    </p>
                  </div>
                  <div className="rounded-[18px] border bg-[var(--bg-subtle)] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--fg-tertiary)]">
                      Operational zone
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--fg-primary)]">{zone}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                onClick={handleCopyEmail}
                className="inline-flex items-center gap-2 rounded-2xl border bg-[var(--bg-surface)] px-4 py-2 text-sm font-medium text-[var(--fg-primary)]"
                type="button"
              >
                <Copy className="h-4 w-4" />
                {copied ? "Copied" : "Copy email"}
              </button>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-2xl border border-[var(--risk-high)]/20 bg-[var(--risk-high-bg)] px-4 py-2 text-sm font-medium text-[var(--risk-high)]"
                type="button"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>

          <div className="surface-card rounded-[28px] p-6">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-[var(--accent-500)]" />
              <h3 className="text-lg font-semibold text-[var(--fg-primary)]">Security status</h3>
            </div>
            <div className="mt-4 space-y-3">
              {[
                {
                  icon: Lock,
                  label: "Session token",
                  value: token ? "Active in this browser" : "Missing",
                  tone: token ? "text-[var(--risk-low)]" : "text-[var(--risk-high)]",
                },
                {
                  icon: CheckCircle2,
                  label: "Last sign in",
                  value: formatDate(lastLogin),
                  tone: "text-[var(--fg-primary)]",
                },
                {
                  icon: UserRound,
                  label: "Account created",
                  value: formatDate(createdAt),
                  tone: "text-[var(--fg-primary)]",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-[18px] border bg-[var(--bg-subtle)] px-4 py-3"
                >
                  <item.icon className="h-4 w-4 text-[var(--fg-tertiary)]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--fg-primary)]">{item.label}</p>
                    <p className={`text-sm ${item.tone}`}>{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-[var(--fg-secondary)]">
              Profile identity fields are read-only right now because this repo does not yet expose
              a profile update endpoint from the backend.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="surface-card rounded-[28px] p-6">
            <div className="flex items-center gap-2">
              <MonitorCog className="h-4 w-4 text-[var(--accent-500)]" />
              <h3 className="text-lg font-semibold text-[var(--fg-primary)]">Experience preferences</h3>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                { value: "light", label: "Light", icon: SunMedium },
                { value: "dark", label: "Dark", icon: MoonStar },
                { value: "system", label: "System", icon: Smartphone },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setPrefs((current) => ({
                      ...current,
                      themePreference: option.value as Preferences["themePreference"],
                    }))
                  }
                  className={`rounded-[18px] border px-4 py-4 text-left transition ${
                    prefs.themePreference === option.value
                      ? "border-[var(--accent-500)] bg-[var(--accent-50)]"
                      : "bg-[var(--bg-subtle)]"
                  }`}
                >
                  <option.icon className="h-4 w-4 text-[var(--fg-tertiary)]" />
                  <p className="mt-3 text-sm font-semibold text-[var(--fg-primary)]">{option.label}</p>
                  <p className="mt-1 text-xs text-[var(--fg-secondary)]">
                    {option.value === "system"
                      ? "Follow device preference"
                      : option.value === "dark"
                        ? "Low-glare night mode"
                        : "Bright daytime interface"}
                  </p>
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              <SettingToggle
                label="Compact data tables"
                description="Use denser FIR and analytics tables for investigation-heavy workflows."
                checked={prefs.compactTables}
                onChange={(value) => setPrefs((current) => ({ ...current, compactTables: value }))}
              />
            </div>
          </div>

          <div className="surface-card rounded-[28px] p-6">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-[var(--accent-500)]" />
              <h3 className="text-lg font-semibold text-[var(--fg-primary)]">Alerts and briefing</h3>
            </div>

            <div className="mt-4 space-y-3">
              <SettingToggle
                label="Email alerts"
                description="Receive sign-in and critical incident notifications by email."
                checked={prefs.emailAlerts}
                onChange={(value) => setPrefs((current) => ({ ...current, emailAlerts: value }))}
              />
              <SettingToggle
                label="Anomaly notifications"
                description="Show dashboard alerts for new high-risk spikes and anomaly detections."
                checked={prefs.anomalyAlerts}
                onChange={(value) => setPrefs((current) => ({ ...current, anomalyAlerts: value }))}
              />
              <SettingToggle
                label="Patrol briefing digest"
                description="Prepare a short morning operational digest for the current zone."
                checked={prefs.patrolBriefing}
                onChange={(value) =>
                  setPrefs((current) => ({ ...current, patrolBriefing: value }))
                }
              />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSavePreferences}
                className="inline-flex items-center gap-2 rounded-2xl bg-[var(--accent-500)] px-4 py-2 text-sm font-semibold text-white"
              >
                Save preferences
              </button>
              {saved ? (
                <span className="text-sm text-[var(--risk-low)]">Preferences saved locally.</span>
              ) : null}
            </div>
          </div>

          <div className="surface-card rounded-[28px] p-6">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-[var(--accent-500)]" />
              <h3 className="text-lg font-semibold text-[var(--fg-primary)]">Account notes</h3>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-[18px] border bg-[var(--bg-subtle)] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--fg-tertiary)]">
                  Identity source
                </p>
                <p className="mt-2 text-sm text-[var(--fg-primary)]">
                  Synced from authenticated backend profile and cached in local browser storage.
                </p>
              </div>
              <div className="rounded-[18px] border bg-[var(--bg-subtle)] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--fg-tertiary)]">
                  Next backend step
                </p>
                <p className="mt-2 text-sm text-[var(--fg-primary)]">
                  Add profile edit and password reset endpoints to make this section fully writable.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
