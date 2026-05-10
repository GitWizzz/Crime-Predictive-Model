"use client";

import { useEffect, useState } from "react";
import { Calendar, Download, Filter, RefreshCw } from "lucide-react";
import { apiGet } from "@/services/api";

type AuditEntry = {
  id: number;
  user_id: number | null;
  user_name: string | null;
  action: string;
  resource: string | null;
  resource_id: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  created_at: string;
};

type Pagination = { page: number; limit: number; total: number; total_pages: number };

const tone = (action: string) =>
  /alert|delete|role|deactivate/i.test(action)
    ? "bg-[var(--risk-high-bg)] text-[var(--risk-high)]"
    : /create|signup|register/i.test(action)
      ? "bg-[var(--risk-low-bg)] text-[var(--risk-low)]"
      : /update|patch|forecast|cluster/i.test(action)
        ? "bg-[var(--accent-50)] text-[var(--accent-700)]"
        : "bg-[var(--bg-subtle)] text-[var(--fg-secondary)]";

const fmtTs = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });

const DATE_OPTIONS = [
  { label: "Last 24h", days: 1 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
];

export default function AuditLogPage() {
  const [token] = useState<string | null>(() =>
    typeof window !== "undefined" ? window.localStorage.getItem("authToken") : null
  );

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [actionFilter, setActionFilter] = useState("");
  const [actorFilter, setActorFilter] = useState("");
  const [dateDays, setDateDays] = useState(7);
  const [page, setPage] = useState(1);
  const [showDateMenu, setShowDateMenu] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);

  const load = async (p = 1) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "50" });
      const fromDate = new Date(Date.now() - dateDays * 86400_000).toISOString().slice(0, 10);
      params.set("fromDate", fromDate);
      if (actionFilter) params.set("action", actionFilter);
      const res = await apiGet(`/api/audit?${params}`, token);
      if (!res.success) throw new Error(res.message || "Failed to load audit logs");
      setEntries(res.data?.entries || []);
      setPagination(res.data?.pagination || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1); setPage(1); }, [token, actionFilter, dateDays]);

  const visibleEntries = actorFilter
    ? entries.filter((e) => (e.user_name || "").toLowerCase().includes(actorFilter.toLowerCase()))
    : entries;

  const exportCsv = () => {
    const headers = ["Timestamp", "Actor", "Action", "Resource", "Resource ID", "IP"];
    const rows = visibleEntries.map((e) => [
      fmtTs(e.created_at),
      e.user_name || "system",
      e.action,
      e.resource || "—",
      e.resource_id || "—",
      e.ip || "—",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const uniqueActions = [...new Set(entries.map((e) => e.action))].sort();

  return (
    <div className="mx-auto max-w-[1440px] space-y-4">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">Audit log</h1>
        <p className="mt-1 text-[13px] text-[var(--fg-secondary)]">
          Every state-changing action — immutable, with actor, resource, and IP
          {pagination ? ` · ${pagination.total} entries` : ""}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Actor filter */}
        <input
          value={actorFilter}
          onChange={(e) => setActorFilter(e.target.value)}
          placeholder="Filter by actor…"
          className="h-10 rounded-[14px] border bg-[var(--bg-surface)] px-4 text-sm text-[var(--fg-primary)] outline-none focus:border-[var(--accent-500)] w-48"
        />

        {/* Action filter */}
        <div className="relative">
          <button
            onClick={() => setShowActionMenu((v) => !v)}
            className="inline-flex h-10 items-center gap-2 rounded-[14px] border bg-[var(--bg-surface)] px-4 text-sm font-medium text-[var(--fg-primary)]"
          >
            <Filter className="h-4 w-4" />
            {actionFilter || "Action: any"}
          </button>
          {showActionMenu && (
            <div className="absolute top-12 left-0 z-20 min-w-[200px] rounded-[16px] border bg-[var(--bg-surface)] p-1 shadow-lg">
              <button
                onClick={() => { setActionFilter(""); setShowActionMenu(false); }}
                className="block w-full rounded-[12px] px-3 py-2 text-left text-sm text-[var(--fg-secondary)] hover:bg-[var(--bg-subtle)]"
              >
                Any action
              </button>
              {uniqueActions.map((a) => (
                <button
                  key={a}
                  onClick={() => { setActionFilter(a); setShowActionMenu(false); }}
                  className="block w-full rounded-[12px] px-3 py-2 text-left text-sm font-mono text-[var(--fg-primary)] hover:bg-[var(--bg-subtle)]"
                >
                  {a}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date range */}
        <div className="relative">
          <button
            onClick={() => setShowDateMenu((v) => !v)}
            className="inline-flex h-10 items-center gap-2 rounded-[14px] border bg-[var(--bg-surface)] px-4 text-sm font-medium text-[var(--fg-primary)]"
          >
            <Calendar className="h-4 w-4" />
            {DATE_OPTIONS.find((o) => o.days === dateDays)?.label || "Custom"}
          </button>
          {showDateMenu && (
            <div className="absolute top-12 left-0 z-20 rounded-[16px] border bg-[var(--bg-surface)] p-1 shadow-lg">
              {DATE_OPTIONS.map((o) => (
                <button
                  key={o.days}
                  onClick={() => { setDateDays(o.days); setShowDateMenu(false); }}
                  className={`block w-full rounded-[12px] px-4 py-2 text-left text-sm font-medium hover:bg-[var(--bg-subtle)] ${dateDays === o.days ? "text-[var(--accent-700)]" : "text-[var(--fg-primary)]"}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => load(page)}
          className="inline-flex h-10 items-center gap-2 rounded-[14px] border bg-[var(--bg-surface)] px-4 text-sm font-medium text-[var(--fg-secondary)]"
        >
          <RefreshCw className="h-4 w-4" />
        </button>

        <button
          onClick={exportCsv}
          disabled={visibleEntries.length === 0}
          className="ml-auto inline-flex h-10 items-center gap-2 rounded-[14px] border bg-[var(--bg-surface)] px-4 text-sm font-medium text-[var(--fg-secondary)] disabled:opacity-40"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {error && (
        <div className="rounded-[14px] border border-[var(--risk-high)]/20 bg-[var(--risk-high-bg)] px-4 py-3 text-sm text-[var(--risk-high)]">
          {error}
        </div>
      )}

      <section className="surface-card overflow-hidden rounded-[24px] p-0">
        <div className="grid grid-cols-[180px_1fr_1fr_160px_120px] border-b bg-[var(--bg-subtle)]/60 px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--fg-tertiary)]">
          <span>Timestamp</span>
          <span>Actor</span>
          <span>Action</span>
          <span>Resource</span>
          <span>IP</span>
        </div>

        {loading ? (
          <div className="px-5 py-8 text-center text-sm text-[var(--fg-tertiary)]">Loading…</div>
        ) : visibleEntries.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-[var(--fg-tertiary)]">No audit entries found for this filter.</div>
        ) : (
          visibleEntries.map((entry) => (
            <div
              key={entry.id}
              className="grid grid-cols-[180px_1fr_1fr_160px_120px] items-center border-b px-5 py-3 font-mono text-[12.5px] last:border-0 hover:bg-[var(--bg-subtle)]/30"
            >
              <span className="tabular-nums text-[var(--fg-tertiary)]">{fmtTs(entry.created_at)}</span>
              <span className="truncate text-[var(--fg-primary)]">{entry.user_name || "system"}</span>
              <span>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone(entry.action)}`}>
                  {entry.action}
                </span>
              </span>
              <span className="truncate text-[var(--fg-secondary)]">
                {[entry.resource, entry.resource_id].filter(Boolean).join("/") || "—"}
              </span>
              <span className="text-[var(--fg-tertiary)]">{entry.ip || "—"}</span>
            </div>
          ))
        )}
      </section>

      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between text-sm text-[var(--fg-secondary)]">
          <span>Page {pagination.page} of {pagination.total_pages} · {pagination.total} total</span>
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
    </div>
  );
}
