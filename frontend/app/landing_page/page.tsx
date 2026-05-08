"use client";

import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  MapPinned,
  Radar,
  Shield,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

const statCards = [
  { label: "Active hotspots", value: "127", tone: "text-[var(--risk-high)]" },
  { label: "Stations covered", value: "42", tone: "text-[var(--accent-600)]" },
  { label: "Forecast confidence", value: "80%", tone: "text-[var(--risk-low)]" },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--bg-base)] text-[var(--fg-primary)]">
      <div className="hero-grid absolute inset-0 opacity-50" />
      <div className="hero-orb absolute left-[6%] top-16 h-72 w-72 rounded-full opacity-70" />
      <div className="hero-orb absolute bottom-10 right-[8%] h-80 w-80 rounded-full opacity-55" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-6 md:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent-500)] to-[var(--accent-700)] text-white shadow-[var(--shadow-sm)]">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-[-0.01em]">Bihar Police</p>
              <p className="text-xs text-[var(--fg-tertiary)]">Crime Intelligence Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden rounded-full border bg-white/70 px-3 py-1.5 text-xs font-medium text-[var(--fg-secondary)] shadow-[var(--shadow-xs)] md:flex dark:bg-[var(--bg-surface)]/80">
              Real-time hotspot, FIR and patrol intelligence
            </div>
            <Link
              href="/login"
              className="rounded-2xl border bg-[var(--bg-surface)] px-4 py-2 text-sm font-medium text-[var(--fg-primary)] shadow-[var(--shadow-xs)] transition hover:bg-[var(--bg-subtle)]"
            >
              Sign in
            </Link>
          </div>
        </header>

        <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.2fr_0.88fr] lg:py-16">
          <section className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-white/72 px-4 py-2 text-sm text-[var(--fg-secondary)] shadow-[var(--shadow-xs)] dark:bg-[var(--bg-surface)]/80">
              <Sparkles className="h-4 w-4 text-[var(--accent-500)]" />
              Geography-first crime intelligence for district and station officers
            </div>

            <h1 className="max-w-4xl text-5xl font-semibold leading-[1.02] tracking-[-0.04em] md:text-7xl">
              Crime control that starts with the map, not the spreadsheet.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--fg-secondary)]">
              A modern command surface for FIR intake, hotspot monitoring, patrol planning,
              and district-level forecasting. Designed for Bihar Police workflows and built
              to stay fast on field hardware.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-2xl bg-[var(--accent-500)] px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow-sm)] transition hover:bg-[var(--accent-600)]"
              >
                Open command board
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-2xl border bg-[var(--bg-surface)] px-5 py-3 text-sm font-medium text-[var(--fg-primary)] shadow-[var(--shadow-xs)] transition hover:bg-[var(--bg-subtle)]"
              >
                Create account
              </Link>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {statCards.map((card) => (
                <div key={card.label} className="surface-card rounded-[22px] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fg-tertiary)]">
                    {card.label}
                  </p>
                  <p className={`mt-3 text-3xl font-semibold tracking-[-0.03em] ${card.tone}`}>
                    {card.value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="surface-card-strong rounded-[30px] p-5 md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fg-tertiary)]">
                  Live preview
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em]">
                  Spatial intelligence overview
                </h2>
              </div>
              <span className="risk-badge-critical inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold">
                <TriangleAlert className="h-3.5 w-3.5" />
                Spike detected
              </span>
            </div>

            <div className="mt-5 overflow-hidden rounded-[26px] border bg-[#dfe8f7] dark:bg-[#101828]">
              <div className="flex items-center justify-between border-b border-white/60 px-4 py-3 text-sm text-slate-700 dark:border-white/10 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <MapPinned className="h-4 w-4 text-[var(--accent-500)]" />
                  Patna Central hotspot map
                </div>
                <div className="rounded-full bg-white/75 px-3 py-1 text-xs shadow-sm dark:bg-white/10">
                  Last 24h
                </div>
              </div>

              <div className="relative h-72 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(59,110,255,0.24),transparent_24%),radial-gradient(circle_at_78%_68%,rgba(239,68,68,0.22),transparent_18%),radial-gradient(circle_at_58%_36%,rgba(245,158,11,0.20),transparent_16%),linear-gradient(180deg,rgba(255,255,255,0.26),rgba(223,232,247,0.92))]" />
                <div className="absolute inset-x-6 top-6 flex items-center gap-2 rounded-2xl border border-white/70 bg-white/76 px-3 py-2 text-xs text-slate-600 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#111827]/80 dark:text-slate-300">
                  <Radar className="h-4 w-4 text-[var(--accent-500)]" />
                  DBSCAN clusters and KDE surface aligned with district overlays
                </div>
                <div className="absolute left-[22%] top-[25%] h-24 w-24 rounded-full bg-red-500/18 blur-[2px]" />
                <div className="absolute left-[27%] top-[30%] h-8 w-8 rounded-full border-4 border-white bg-red-500 shadow-lg" />
                <div className="absolute left-[58%] top-[22%] h-16 w-16 rounded-full bg-amber-400/18 blur-[2px]" />
                <div className="absolute left-[61%] top-[27%] h-6 w-6 rounded-full border-4 border-white bg-amber-500 shadow-lg" />
                <div className="absolute left-[47%] top-[58%] h-20 w-20 rounded-full bg-blue-500/16 blur-[2px]" />
                <div className="absolute left-[52%] top-[63%] h-7 w-7 rounded-full border-4 border-white bg-[var(--accent-500)] shadow-lg" />

                <div className="absolute bottom-5 left-5 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#111827]/84">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Priority cluster
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                    Patna Central
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    127 incidents, theft-heavy cluster, 1.4 km radius
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-[22px] border bg-[var(--bg-subtle)] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--fg-primary)]">
                  <BellRing className="h-4 w-4 text-[var(--risk-high)]" />
                  Alert briefing
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--fg-secondary)]">
                  Thefts in Patna Central are 23% above the 4-week average with a repeat
                  window between 22:00 and 02:00.
                </p>
              </div>

              <div className="rounded-[22px] border bg-[var(--bg-subtle)] p-4">
                <p className="text-sm font-semibold text-[var(--fg-primary)]">Core actions</p>
                <div className="mt-3 space-y-2 text-sm text-[var(--fg-secondary)]">
                  <div>Register FIR in under 90 seconds</div>
                  <div>Review hotspot density by district and station</div>
                  <div>Dispatch patrols from cluster insights</div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
