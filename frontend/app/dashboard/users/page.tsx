"use client";

import { useEffect, useState } from "react";
import { MoreHorizontal, Plus, Search, RefreshCw } from "lucide-react";
import { apiGet, apiPost } from "@/services/api";

type UserRow = {
  id: number;
  name: string;
  email: string;
  role: "OFFICER" | "ANALYST" | "ADMIN";
  police_station: string | null;
  zone: string | null;
  is_active: boolean;
  created_at: string;
};

type Pagination = { page: number; limit: number; total: number; total_pages: number };

const roleTone = (role: UserRow["role"]) =>
  role === "ADMIN"
    ? "bg-[var(--risk-high-bg)] text-[var(--risk-high)]"
    : role === "ANALYST"
      ? "bg-[var(--accent-50)] text-[var(--accent-700)]"
      : "bg-[var(--bg-subtle)] text-[var(--fg-secondary)]";

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

export default function UsersPage() {
  const [token] = useState<string | null>(() =>
    typeof window !== "undefined" ? window.localStorage.getItem("authToken") : null
  );
  const [authUser] = useState<{ role?: string } | null>(() => {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(window.localStorage.getItem("authUser") || "null"); } catch { return null; }
  });

  const [users, setUsers] = useState<UserRow[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showInvite, setShowInvite] = useState(false);
  const [invite, setInvite] = useState({ name: "", email: "", password: "", role: "OFFICER", police_station: "", zone: "" });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const isAdmin = authUser?.role === "ADMIN";

  const load = async (p = page) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "25" });
      if (roleFilter) params.set("role", roleFilter);
      const res = await apiGet(`/api/users?${params}`, token);
      if (!res.success) throw new Error(res.message || "Failed to load users");
      setUsers(res.data?.users || []);
      setPagination(res.data?.pagination || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1); setPage(1); }, [token, roleFilter]);

  const handleInvite = async () => {
    if (!token) return;
    setInviteLoading(true);
    setInviteError(null);
    try {
      const res = await apiPost("/api/auth/signup", {
        name: invite.name,
        email: invite.email,
        password: invite.password,
        role: invite.role,
        police_station: invite.police_station || undefined,
        zone: invite.zone || undefined,
      }, token);
      if (!res.success) throw new Error(res.message || "Failed to invite user");
      setShowInvite(false);
      setInvite({ name: "", email: "", password: "", role: "OFFICER", police_station: "", zone: "" });
      load(1);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to invite user");
    } finally {
      setInviteLoading(false);
    }
  };

  const visibleUsers = search
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase()) ||
          (u.police_station || "").toLowerCase().includes(search.toLowerCase())
      )
    : users;

  return (
    <div className="mx-auto max-w-[1440px] space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">Users</h1>
          <p className="mt-1 text-[13px] text-[var(--fg-secondary)]">
            {pagination ? `${pagination.total} officers` : "—"} across the system
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load(page)}
            className="inline-flex h-10 items-center gap-2 rounded-[14px] border bg-[var(--bg-surface)] px-4 text-sm font-medium text-[var(--fg-secondary)]"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowInvite(true)}
              className="inline-flex h-10 items-center gap-2 rounded-[14px] bg-[var(--accent-500)] px-4 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              Invite user
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--fg-tertiary)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, station…"
            className="h-10 rounded-[14px] border bg-[var(--bg-surface)] pl-9 pr-4 text-sm text-[var(--fg-primary)] outline-none focus:border-[var(--accent-500)] w-72"
          />
        </div>
        {(["", "ADMIN", "ANALYST", "OFFICER"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              roleFilter === r
                ? "border-[var(--accent-500)] bg-[var(--accent-50)] text-[var(--accent-700)]"
                : "bg-[var(--bg-surface)] text-[var(--fg-secondary)]"
            }`}
          >
            {r || "All roles"}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-[14px] border border-[var(--risk-high)]/20 bg-[var(--risk-high-bg)] px-4 py-3 text-sm text-[var(--risk-high)]">
          {error}
        </div>
      )}

      <section className="surface-card overflow-hidden rounded-[24px] p-0">
        <div className="grid grid-cols-[2fr_1.4fr_100px_1.2fr_120px_80px_60px] border-b bg-[var(--bg-subtle)]/60 px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--fg-tertiary)]">
          <span>Name</span>
          <span>Email</span>
          <span>Role</span>
          <span>Station / Zone</span>
          <span>Member since</span>
          <span>Status</span>
          <span />
        </div>

        {loading ? (
          <div className="px-5 py-8 text-center text-sm text-[var(--fg-tertiary)]">Loading…</div>
        ) : visibleUsers.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-[var(--fg-tertiary)]">No users found.</div>
        ) : (
          visibleUsers.map((user) => (
            <div
              key={user.id}
              className="grid grid-cols-[2fr_1.4fr_100px_1.2fr_120px_80px_60px] items-center border-b px-5 py-3 text-[13px] last:border-0 hover:bg-[var(--bg-subtle)]/40"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-[var(--accent-50)] text-[11px] font-semibold text-[var(--accent-700)]">
                  {user.name[0]}
                </span>
                <span className="truncate font-medium text-[var(--fg-primary)]">{user.name}</span>
              </div>
              <span className="truncate font-mono text-[11.5px] text-[var(--fg-secondary)]">{user.email}</span>
              <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${roleTone(user.role)}`}>
                {user.role}
              </span>
              <span className="truncate text-[var(--fg-secondary)]">
                {user.police_station || user.zone || "—"}
              </span>
              <span className="tabular-nums text-[var(--fg-tertiary)]">{fmtDate(user.created_at)}</span>
              <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${user.is_active ? "bg-[var(--risk-low-bg)] text-[var(--risk-low)]" : "bg-[var(--bg-subtle)] text-[var(--fg-tertiary)]"}`}>
                {user.is_active ? "Active" : "Inactive"}
              </span>
              <span className="text-right text-[var(--fg-tertiary)]">
                <MoreHorizontal className="h-4 w-4" />
              </span>
            </div>
          ))
        )}
      </section>

      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between text-sm text-[var(--fg-secondary)]">
          <span>
            Page {pagination.page} of {pagination.total_pages} · {pagination.total} total
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => { const p = page - 1; setPage(p); load(p); }}
              className="rounded-[12px] border bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={page >= pagination.total_pages}
              onClick={() => { const p = page + 1; setPage(p); load(p); }}
              className="rounded-[12px] border bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-[24px] bg-[var(--bg-surface)] p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-[var(--fg-primary)]">Invite new user</h2>
            <div className="mt-4 space-y-3">
              {[
                { label: "Full name", key: "name", type: "text" },
                { label: "Email", key: "email", type: "email" },
                { label: "Password", key: "password", type: "password" },
                { label: "Police station", key: "police_station", type: "text" },
                { label: "Zone / district", key: "zone", type: "text" },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--fg-tertiary)]">{label}</label>
                  <input
                    type={type}
                    value={invite[key as keyof typeof invite]}
                    onChange={(e) => setInvite((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="h-10 w-full rounded-[12px] border bg-[var(--bg-subtle)] px-3 text-sm text-[var(--fg-primary)] outline-none focus:border-[var(--accent-500)]"
                  />
                </div>
              ))}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--fg-tertiary)]">Role</label>
                <select
                  value={invite.role}
                  onChange={(e) => setInvite((prev) => ({ ...prev, role: e.target.value }))}
                  className="h-10 w-full rounded-[12px] border bg-[var(--bg-subtle)] px-3 text-sm text-[var(--fg-primary)] outline-none"
                >
                  <option value="OFFICER">Officer</option>
                  <option value="ANALYST">Analyst</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>
            {inviteError && (
              <p className="mt-3 text-sm text-[var(--risk-high)]">{inviteError}</p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => { setShowInvite(false); setInviteError(null); }}
                className="rounded-[12px] border px-4 py-2 text-sm font-medium text-[var(--fg-secondary)]"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={inviteLoading || !invite.name || !invite.email || !invite.password}
                className="rounded-[12px] bg-[var(--accent-500)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {inviteLoading ? "Inviting…" : "Invite"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
