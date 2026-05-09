"use client";

import { Calendar, Download, Filter } from "lucide-react";

const rows = [
  {
    ts: "08 May 14:22:41",
    actor: "p.singh",
    action: "fir.create",
    entity: "FIR-2026-05-08-014",
    ip: "10.42.1.18",
  },
  {
    ts: "08 May 14:08:12",
    actor: "system",
    action: "fence.alert.trigger",
    entity: "fence-school-zones",
    ip: "—",
  },
  {
    ts: "08 May 13:52:03",
    actor: "r.kumar",
    action: "forecast.run",
    entity: "patna_theft_30d",
    ip: "10.42.1.4",
  },
  {
    ts: "08 May 13:08:55",
    actor: "a.choudhary",
    action: "fir.update",
    entity: "FIR-2026-05-08-012",
    ip: "10.42.5.9",
  },
  {
    ts: "08 May 12:01:20",
    actor: "s.banerjee",
    action: "user.role.change",
    entity: "user/k.devi",
    ip: "10.42.0.2",
  },
  {
    ts: "08 May 11:48:09",
    actor: "m.verma",
    action: "patrol.dispatch",
    entity: "RT-012",
    ip: "10.42.7.3",
  },
  {
    ts: "08 May 10:31:44",
    actor: "k.devi",
    action: "fir.create",
    entity: "FIR-2026-05-08-010",
    ip: "10.42.5.22",
  },
  {
    ts: "08 May 09:17:01",
    actor: "system",
    action: "ml.cluster.refresh",
    entity: "hotspots/patna",
    ip: "—",
  },
];

const tone = (action: string) =>
  action.includes("alert")
    ? "bg-[var(--risk-high-bg)] text-[var(--risk-high)]"
    : action.includes("role")
      ? "bg-[var(--risk-high-bg)] text-[var(--risk-high)]"
      : action.includes("create")
        ? "bg-[var(--risk-low-bg)] text-[var(--risk-low)]"
        : "bg-[var(--bg-subtle)] text-[var(--fg-secondary)]";

export default function AuditLogPage() {
  return (
    <div className="mx-auto max-w-[1440px] space-y-4">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">
          Audit log
        </h1>
        <p className="mt-1 text-[13px] text-[var(--fg-secondary)]">
          Every state-changing action, immutable, with before/after diff
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button className="inline-flex h-10 items-center gap-2 rounded-[14px] border bg-[var(--bg-surface)] px-4 text-sm font-medium text-[var(--fg-primary)]">
          <Filter className="h-4 w-4" />
          Actor: any
        </button>
        <button className="inline-flex h-10 items-center gap-2 rounded-[14px] border bg-[var(--bg-surface)] px-4 text-sm font-medium text-[var(--fg-primary)]">
          <Filter className="h-4 w-4" />
          Action: any
        </button>
        <button className="inline-flex h-10 items-center gap-2 rounded-[14px] border bg-[var(--bg-surface)] px-4 text-sm font-medium text-[var(--fg-primary)]">
          <Calendar className="h-4 w-4" />
          Last 7 days
        </button>
        <button className="inline-flex h-10 items-center gap-2 rounded-[14px] px-4 text-sm font-medium text-[var(--fg-secondary)] transition hover:bg-[var(--bg-subtle)]">
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      <section className="surface-card overflow-hidden rounded-[24px] p-0">
        <div className="grid grid-cols-[160px_1fr_140px_100px_120px] border-b bg-[var(--bg-subtle)]/60 px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--fg-tertiary)]">
          <span>Timestamp</span>
          <span>Actor</span>
          <span>Action</span>
          <span>Entity</span>
          <span>IP</span>
        </div>
        {rows.map((row) => (
          <div
            key={`${row.ts}-${row.action}`}
            className="grid grid-cols-[160px_1fr_140px_100px_120px] items-center border-b px-5 py-3 font-mono text-[12.5px] last:border-0"
          >
            <span className="tabular-nums text-[var(--fg-tertiary)]">{row.ts}</span>
            <span className="text-[var(--fg-primary)]">{row.actor}</span>
            <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone(row.action)}`}>
              {row.action}
            </span>
            <span className="truncate text-[var(--fg-secondary)]">{row.entity}</span>
            <span className="text-[var(--fg-tertiary)]">{row.ip}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
