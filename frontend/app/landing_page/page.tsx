"use client";

import Link from "next/link";
import {
  ArrowRight,
  ChartNoAxesColumn,
  Clock3,
  MapPinned,
  Radar,
  Route,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Zap,
} from "lucide-react";

const statCards = [
  { label: "Active hotspots", value: "127", tone: "text-[var(--risk-high)]" },
  { label: "Stations covered", value: "42", tone: "text-[var(--accent-500)]" },
  { label: "Forecast confidence", value: "80%", tone: "text-[var(--risk-low)]" },
];

const pillars = [
  {
    icon: Radar,
    title: "Map-first command intelligence",
    copy: "Detect DBSCAN/KDE hotspots with district overlays before incidents escalate.",
  },
  {
    icon: ShieldAlert,
    title: "Field-grade FIR operations",
    copy: "Register FIRs quickly, preserve evidence context, and route action to stations.",
  },
  {
    icon: ChartNoAxesColumn,
    title: "Forecasts with confidence bands",
    copy: "Turn trend signals into patrol decisions with interpretable confidence ranges.",
  },
];

const workflow = [
  { step: "01", title: "Ingest FIR data", icon: ShieldCheck },
  { step: "02", title: "Detect priority clusters", icon: Radar },
  { step: "03", title: "Dispatch patrol routes", icon: Route },
  { step: "04", title: "Track response impact", icon: Clock3 },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen app-shell-bg text-[var(--fg-primary)]">
      <div className="pointer-events-none absolute inset-0 hero-grid opacity-30" />
      <div className="relative z-10 mx-auto max-w-7xl px-5 pb-14 pt-6 md:px-7 md:pt-8">
        <main className="mt-0 space-y-8 md:mt-0 md:space-y-10">
          <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <article className="surface-card-strong rounded-3xl p-6 md:p-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--fg-secondary)]">
                <Sparkles className="h-3.5 w-3.5 text-[var(--accent-500)]" />
                Geography-first policing platform
              </div>
              <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-[-0.03em] md:text-6xl">
                Crime control that starts with the map, not the spreadsheet.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--fg-secondary)] md:text-lg">
                A decision surface for hotspot detection, FIR intelligence, and patrol planning
                built for Bihar Police operations across district and station levels.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-2.5 text-sm font-semibold transition hover:bg-[var(--bg-subtle)]"
                >
                  Create account
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-500)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-600)]"
                >
                  Open command board
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {statCards.map((card) => (
                  <div key={card.label} className="rounded-2xl border bg-[var(--bg-surface)] p-4">
                    <p className="text-xs uppercase tracking-[0.1em] text-[var(--fg-tertiary)]">
                      {card.label}
                    </p>
                    <p className={`mt-2 text-2xl font-semibold ${card.tone}`}>{card.value}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="surface-card-strong overflow-hidden rounded-3xl">
              <div className="border-b px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <MapPinned className="h-4 w-4 text-[var(--accent-500)]" />
                    Live command preview
                  </div>
                  <span className="rounded-full bg-[var(--risk-high-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--risk-high)]">
                    Spike detected
                  </span>
                </div>
              </div>
              <div className="relative h-[280px]">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage:
                      "url('https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Vidhan-sabha-bihar.jpg/1400px-Vidhan-sabha-bihar.jpg')",
                  }}
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,13,16,0.18),rgba(11,13,16,0.75))]" />
                <div className="absolute left-4 top-4 rounded-xl border border-white/20 bg-black/45 px-3 py-2 text-xs font-medium text-white backdrop-blur">
                  Patna Central • Last 24h
                </div>
                <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-white/15 bg-black/45 p-3 text-white backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.1em] text-white/75">Priority cluster</p>
                  <p className="mt-1 text-base font-semibold">Theft-heavy movement corridor</p>
                  <p className="mt-1 text-xs text-white/80">
                    127 incidents • +23% WoW • Route dispatch ETA: 12 min
                  </p>
                </div>
              </div>
              <div className="grid gap-2 p-4 text-sm text-[var(--fg-secondary)] sm:grid-cols-2">
                <div className="rounded-xl border bg-[var(--bg-surface)] p-3">
                  <p className="font-semibold text-[var(--fg-primary)]">Hindi-ready brief</p>
                  <p className="mt-1">Risk summary in English and Hindi for station roll-call.</p>
                </div>
                <div className="rounded-xl border bg-[var(--bg-surface)] p-3">
                  <p className="font-semibold text-[var(--fg-primary)]">Explainable ML</p>
                  <p className="mt-1">Forecast ranges with confidence, not black-box scores.</p>
                </div>
              </div>
            </article>
          </section>

          <section id="capabilities" className="grid gap-4 md:grid-cols-3">
            {pillars.map((item) => (
              <article key={item.title} className="surface-card rounded-2xl p-5">
                <span className="inline-grid h-10 w-10 place-items-center rounded-xl bg-[var(--accent-50)] text-[var(--accent-600)]">
                  <item.icon className="h-5 w-5" />
                </span>
                <h2 className="mt-4 text-lg font-semibold">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--fg-secondary)]">{item.copy}</p>
              </article>
            ))}
          </section>

          <section id="workflow" className="surface-card rounded-3xl p-6 md:p-7">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--fg-secondary)]">
              <Zap className="h-4 w-4 text-[var(--accent-500)]" />
              Operational loop
            </div>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.02em]">
              Built for 90-second decision cycles
            </h3>
            <div className="mt-5 grid gap-3 md:grid-cols-4">
              {workflow.map((item) => (
                <div key={item.step} className="rounded-2xl border bg-[var(--bg-surface)] p-4">
                  <p className="text-xs font-semibold tracking-[0.12em] text-[var(--fg-tertiary)]">
                    STEP {item.step}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <item.icon className="h-4 w-4 text-[var(--accent-500)]" />
                    <p className="text-sm font-semibold text-[var(--fg-primary)]">{item.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section id="launch" className="surface-card-strong rounded-3xl p-6 md:p-8">
            <p className="text-sm font-medium text-[var(--fg-secondary)]">
              Predictive intelligence for Bihar Police
            </p>
            <h4 className="mt-2 text-2xl font-semibold tracking-[-0.02em] md:text-3xl">
              Launch the command center and move from reaction to prevention.
            </h4>
            <p className="mt-3 text-sm text-[var(--fg-secondary)]">
              Start with hotspot visibility, then scale to patrol optimization and weekly forecast
              briefings across districts.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-500)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-600)]"
              >
                Open command board
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-2.5 text-sm font-semibold transition hover:bg-[var(--bg-subtle)]"
              >
                Create operator account
              </Link>
            </div>
          </section>
        </main>

        <footer className="mt-10 border-t pt-5 text-xs text-[var(--fg-tertiary)]">
          Government of Bihar • Crime Predictive Hotspot Mapping System
        </footer>
        </div>
    </div>
  );
}
