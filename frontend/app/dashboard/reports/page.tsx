"use client";

import { useState } from "react";
import { BarChart3, Car, ClipboardList, Download, FileText, Sparkles } from "lucide-react";

type Tab = "quick" | "sched" | "arch";

type QuickReport = {
  title: string;
  desc: string;
  icon: React.ElementType;
  startDays: number;
  zone?: string;
  crimeType?: string;
};

const quickReports: QuickReport[] = [
  { title: "Weekly digest", desc: "7-day FIR export — all types, all zones", icon: FileText, startDays: 7 },
  { title: "Monthly SP brief", desc: "30-day full FIR export for SP review", icon: ClipboardList, startDays: 30 },
  { title: "Theft incidents", desc: "Last 30 days · theft category only", icon: FileText, startDays: 30, crimeType: "Theft" },
  { title: "Zone comparison", desc: "Patna district — last 90 days", icon: BarChart3, startDays: 90, zone: "Patna" },
  { title: "Violent crimes", desc: "Murder + assault, last 30 days", icon: Sparkles, startDays: 30, crimeType: "Murder" },
  { title: "Road safety", desc: "Last 30 days · all categories", icon: Car, startDays: 30 },
];

const scheduledReports = [
  { report: "Weekly digest", schedule: "Mon 06:00 IST", recipients: "sp@bihar.police.in +4", lastRun: "May 06, 06:00" },
  { report: "Monthly SP brief", schedule: "1st of month", recipients: "sp@bihar.police.in", lastRun: "May 01, 09:00" },
  { report: "Patrol performance", schedule: "Daily 23:30", recipients: "leadership · 12 users", lastRun: "May 07, 23:30" },
];

const ARCHIVE_KEY = "report_archive";

type ArchiveEntry = { title: string; generatedAt: string; filename: string };

function loadArchive(): ArchiveEntry[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(ARCHIVE_KEY) || "[]"); } catch { return []; }
}

function saveArchive(entries: ArchiveEntry[]) {
  if (typeof window !== "undefined") localStorage.setItem(ARCHIVE_KEY, JSON.stringify(entries.slice(0, 20)));
}

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>("quick");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [archive, setArchive] = useState<ArchiveEntry[]>(loadArchive);

  const token = typeof window !== "undefined" ? window.localStorage.getItem("authToken") : null;

  const downloadCsv = async (report: QuickReport) => {
    if (!token) { setError("Not authenticated. Please log in."); return; }
    setLoading(report.title);
    setError(null);
    try {
      const startDate = new Date(Date.now() - report.startDays * 86400_000).toISOString().slice(0, 10);
      const params = new URLSearchParams({ startDate });
      if (report.zone) params.set("zone", report.zone);
      if (report.crimeType) params.set("crimeType", report.crimeType);

      const res = await fetch(`/api/analytics/export/csv?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`Export failed: ${res.statusText}`);

      const blob = await res.blob();
      const filename = `${report.title.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      const entry: ArchiveEntry = { title: report.title, generatedAt: new Date().toISOString(), filename };
      const updated = [entry, ...archive];
      setArchive(updated);
      saveArchive(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] space-y-4">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">Reports</h1>
        <p className="mt-1 text-[13px] text-[var(--fg-secondary)]">
          Export FIR data as CSV — quick exports, scheduled dispatches, and past downloads
        </p>
      </div>

      {error && (
        <div className="rounded-[14px] border border-[var(--risk-high)]/20 bg-[var(--risk-high-bg)] px-4 py-3 text-sm text-[var(--risk-high)]">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {([
          { id: "quick", label: "Quick reports" },
          { id: "sched", label: "Scheduled" },
          { id: "arch", label: "Archive", count: archive.length },
        ] as { id: Tab; label: string; count?: number }[]).map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
              tab === item.id
                ? "border-[var(--accent-500)] bg-[var(--accent-50)] text-[var(--accent-700)]"
                : "bg-[var(--bg-surface)] text-[var(--fg-secondary)]"
            }`}
          >
            {item.label}
            {item.count !== undefined ? (
              <span className="rounded-full bg-[var(--bg-subtle)] px-2 py-0.5 text-[11px]">{item.count}</span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "quick" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {quickReports.map((report) => (
            <section
              key={report.title}
              className="surface-card rounded-[24px] p-5 transition hover:border-[var(--border-strong)]"
            >
              <span className="mb-3 inline-grid h-10 w-10 place-items-center rounded-[14px] bg-[var(--accent-50)] text-[var(--accent-600)]">
                <report.icon className="h-4 w-4" />
              </span>
              <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--fg-primary)]">
                {report.title}
              </h2>
              <p className="mt-1 text-[12.5px] text-[var(--fg-secondary)]">{report.desc}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => downloadCsv(report)}
                  disabled={loading === report.title}
                  className="inline-flex items-center gap-1.5 rounded-[12px] bg-[var(--accent-500)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                >
                  <Download className="h-3.5 w-3.5" />
                  {loading === report.title ? "Exporting…" : "CSV"}
                </button>
                <button
                  disabled
                  className="rounded-[12px] border bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--fg-tertiary)] opacity-50 cursor-not-allowed"
                  title="PDF generation coming soon"
                >
                  PDF
                </button>
              </div>
            </section>
          ))}
        </div>
      )}

      {tab === "sched" && (
        <section className="surface-card overflow-hidden rounded-[24px] p-0">
          <div className="border-b bg-[var(--bg-subtle)]/40 px-5 py-4">
            <p className="text-sm text-[var(--fg-secondary)]">
              Scheduled exports require email/SMTP configuration on the server. These are planned schedules — configure in the backend environment to activate.
            </p>
          </div>
          <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_80px] border-b bg-[var(--bg-subtle)]/60 px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--fg-tertiary)]">
            <span>Report</span>
            <span>Schedule</span>
            <span>Recipients</span>
            <span>Last run</span>
            <span />
          </div>
          {scheduledReports.map((row) => (
            <div
              key={row.report}
              className="grid grid-cols-[1.5fr_1fr_1fr_1fr_80px] items-center border-b px-5 py-3 text-[12.5px] last:border-0"
            >
              <span className="font-medium text-[var(--fg-primary)]">{row.report}</span>
              <span className="text-[var(--fg-secondary)]">{row.schedule}</span>
              <span className="truncate text-[var(--fg-secondary)]">{row.recipients}</span>
              <span className="tabular-nums text-[var(--fg-tertiary)]">{row.lastRun}</span>
              <span className="text-right">
                <span className="rounded-[10px] px-2 py-1 text-xs font-medium text-[var(--fg-tertiary)]">Planned</span>
              </span>
            </div>
          ))}
        </section>
      )}

      {tab === "arch" && (
        <section className="surface-card overflow-hidden rounded-[24px] p-0">
          {archive.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-[var(--fg-tertiary)]">
              No exports yet. Generate a CSV from Quick reports — it will appear here.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[1.5fr_1fr_1fr_100px] border-b bg-[var(--bg-subtle)]/60 px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--fg-tertiary)]">
                <span>Report</span>
                <span>File</span>
                <span>Generated</span>
                <span />
              </div>
              {archive.map((entry, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1.5fr_1fr_1fr_100px] items-center border-b px-5 py-3 text-[12.5px] last:border-0 hover:bg-[var(--bg-subtle)]/50"
                >
                  <span className="font-medium text-[var(--fg-primary)]">{entry.title}</span>
                  <span className="truncate font-mono text-[11px] text-[var(--fg-secondary)]">{entry.filename}</span>
                  <span className="tabular-nums text-[var(--fg-tertiary)]">
                    {new Date(entry.generatedAt).toLocaleString("en-IN", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                  <span className="text-right text-[11px] text-[var(--fg-tertiary)]">Downloaded</span>
                </div>
              ))}
            </>
          )}
        </section>
      )}
    </div>
  );
}
