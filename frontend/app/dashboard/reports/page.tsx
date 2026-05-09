"use client";

import { useState } from "react";
import { BarChart3, Car, ClipboardList, FileText, Sparkles } from "lucide-react";

type Tab = "quick" | "sched" | "arch";

const quickReports = [
  { title: "Weekly digest", desc: "7-day FIR + hotspot summary", icon: FileText },
  { title: "Monthly SP brief", desc: "30-day full picture for SP", icon: ClipboardList },
  { title: "Incident summary", desc: "Single-incident PDF dossier", icon: FileText },
  { title: "Zone comparison", desc: "Side-by-side metrics", icon: BarChart3 },
  { title: "Forecast pack", desc: "30-day forecast + drivers", icon: Sparkles },
  { title: "Patrol performance", desc: "Unit-level completion stats", icon: Car },
];

const scheduledReports = [
  {
    report: "Weekly digest",
    schedule: "Mon 06:00 IST",
    recipients: "sp@bihar.police.in +4",
    lastRun: "May 06, 06:00",
  },
  {
    report: "Monthly SP brief",
    schedule: "1st of month",
    recipients: "sp@bihar.police.in",
    lastRun: "May 01, 09:00",
  },
  {
    report: "Patrol performance",
    schedule: "Daily 23:30",
    recipients: "leadership · 12 users",
    lastRun: "May 07, 23:30",
  },
];

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>("quick");

  return (
    <div className="mx-auto max-w-[1440px] space-y-4">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">
          Reports
        </h1>
        <p className="mt-1 text-[13px] text-[var(--fg-secondary)]">
          Pre-built templates and scheduled exports
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: "quick", label: "Quick reports" },
          { id: "sched", label: "Scheduled" },
          { id: "arch", label: "Archive", count: 24 },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id as Tab)}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
              tab === item.id
                ? "border-[var(--accent-500)] bg-[var(--accent-50)] text-[var(--accent-700)]"
                : "bg-[var(--bg-surface)] text-[var(--fg-secondary)]"
            }`}
          >
            {item.label}
            {"count" in item ? (
              <span className="rounded-full bg-[var(--bg-subtle)] px-2 py-0.5 text-[11px]">
                {item.count}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "quick" ? (
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
                <button className="rounded-[12px] border bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--fg-primary)]">
                  PDF
                </button>
                <button className="rounded-[12px] border bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--fg-primary)]">
                  CSV
                </button>
                <button className="rounded-[12px] px-3 py-1.5 text-xs font-medium text-[var(--fg-secondary)] transition hover:bg-[var(--bg-subtle)]">
                  Schedule
                </button>
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {tab === "sched" ? (
        <section className="surface-card overflow-hidden rounded-[24px] p-0">
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
                <button className="rounded-[10px] px-2 py-1 text-xs font-medium text-[var(--fg-secondary)] transition hover:bg-[var(--bg-subtle)]">
                  Edit
                </button>
              </span>
            </div>
          ))}
        </section>
      ) : null}

      {tab === "arch" ? (
        <section className="surface-card overflow-hidden rounded-[24px] p-0">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="grid grid-cols-[1.5fr_1fr_120px_100px] items-center border-b px-5 py-3 text-[12.5px] last:border-0 hover:bg-[var(--bg-subtle)]/50"
            >
              <span className="font-medium text-[var(--fg-primary)]">
                Weekly digest · Week {18 - index}, 2026
              </span>
              <span className="text-[var(--fg-secondary)]">Generated by system</span>
              <span className="tabular-nums text-[var(--fg-tertiary)]">
                May {6 - index}, 06:00
              </span>
              <button className="rounded-[12px] border bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--fg-primary)]">
                Download
              </button>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
