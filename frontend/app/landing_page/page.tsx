"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  FileText,
  MapPinned,
  Route,
  Shield,
  ShieldCheck,
  TrendingUp,
  Users,
  Activity,
  Lock,
} from "lucide-react";

const LandingMap = dynamic(() => import("@/components/map/LandingMap"), { ssr: false });

const navLinkClass =
  "rounded-sm px-3 py-2 text-sm font-semibold transition text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100";

const features = [
  {
    icon: MapPinned,
    title: "Community Hotspot Awareness",
    desc: "Evidence-based spatial analysis helps officers understand where communities need greater support — without profiling individuals.",
    accent: "#22c55e",
  },
  {
    icon: TrendingUp,
    title: "Transparent Forecasting",
    desc: "Open, explainable crime-trend predictions with confidence intervals so decisions are always grounded in accountable data.",
    accent: "#22c55e",
  },
  {
    icon: Route,
    title: "Equitable Patrol Coverage",
    desc: "Optimised patrol routes ensure all 38 districts receive responsive, proportionate policing — not just high-visibility areas.",
    accent: "#22c55e",
  },
  {
    icon: FileText,
    title: "Structured FIR Processing",
    desc: "Structured intake and classification of FIR records improves case continuity, reduces manual error, and supports victim follow-up.",
    accent: "#22c55e",
  },
  {
    icon: Users,
    title: "Victim-Centred Reporting",
    desc: "Women safety and vulnerable-group dashboards prioritise the welfare of people affected by crime, not just crime statistics.",
    accent: "#dc2626",
  },
  {
    icon: Lock,
    title: "Privacy-Respecting by Design",
    desc: "Role-based access, audit logs, and anonymised aggregation ensure data is used only for legitimate public-safety purposes.",
    accent: "#22c55e",
  },
];

const stats = [
  { value: "38", label: "Districts Served", icon: MapPinned },
  { value: "100%", label: "Audit Logged", icon: Shield },
  { value: "SHAP", label: "Explainable AI", icon: Activity },
  { value: "24/7", label: "Real-Time Analysis", icon: BarChart3 },
];

const districts = [
  { name: "Patna", score: 84, level: "high" },
  { name: "Gaya", score: 71, level: "medium" },
  { name: "Muzaffarpur", score: 63, level: "low" },
];

const levelStyles: Record<string, { dot: string; badge: string; score: string }> = {
  high:   { dot: "bg-red-500",   badge: "border-red-500/30 bg-red-950/50",  score: "text-red-400" },
  medium: { dot: "bg-amber-500", badge: "border-amber-500/30 bg-amber-950/50", score: "text-amber-400" },
  low:    { dot: "bg-green-500", badge: "border-green-500/30 bg-green-950/50", score: "text-green-400" },
};

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0d0f12] text-zinc-100">

      {/* ── Ambient Background Orbs ─────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-[600px] w-[600px] rounded-full bg-[#22c55e]/5 blur-[120px]" />
        <div className="absolute -bottom-32 -right-16 h-[500px] w-[500px] rounded-full bg-red-500/[0.04] blur-[100px]" />
        <div className="absolute left-1/3 top-1/2 h-[400px] w-[400px] rounded-full bg-[#22c55e]/[0.03] blur-[80px]" />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      {/* ── Navigation ──────────────────────────────────────── */}
      <nav className="relative z-20 flex h-16 items-center justify-between border-b border-white/[0.06] bg-[#0d0f12]/80 px-6 backdrop-blur-xl">
        <Link href="/landing_page" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/20">
            <Shield className="h-5 w-5 text-[#22c55e]" />
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-zinc-100">CrimeIntel</span>
            <span className="ml-2 text-[10px] font-semibold uppercase tracking-widest text-[#22c55e]/60">Bihar Police</span>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/landing_page" className={navLinkClass}>Home</Link>
          <Link href="/login" className="rounded-sm border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-[#22c55e]/40 hover:bg-[#22c55e]/10">
            Officer Portal
          </Link>
          <Link href="/signup" className="rounded-sm bg-[#22c55e] px-4 py-2 text-sm font-bold text-white shadow-[0_0_20px_rgba(34,197,94,0.25)] transition hover:bg-[#16a34a] hover:shadow-[0_0_30px_rgba(34,197,94,0.35)]">
            Create Account
          </Link>
        </div>
      </nav>

      {/* ── Hero Section ─────────────────────────────────────── */}
      <section className="relative z-10 grid min-h-[calc(100vh-64px-73px)] grid-cols-1 lg:grid-cols-[1fr_1.2fr]">

        {/* Left: Hero Copy */}
        <div className="flex flex-col justify-center px-8 py-12 lg:px-12 lg:py-16">
          {/* Live badge */}
          <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-[#22c55e]/25 bg-[#22c55e]/8 px-3.5 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22c55e] opacity-50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22c55e]" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#22c55e]">Evidence-Based Policing · Bihar</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl font-black leading-[1.08] tracking-[-0.04em] text-zinc-50 lg:text-6xl">
            Safer Communities
            <br />
            <span className="bg-gradient-to-r from-[#22c55e] to-[#4ade80] bg-clip-text text-transparent">
              Through Transparent Data
            </span>
          </h1>

          {/* Subtext */}
          <p className="mt-5 max-w-lg text-base leading-relaxed text-zinc-400 lg:text-[15px]">
            CrimeIntel helps Bihar Police allocate resources fairly, respond faster, and report
            transparently — giving officers the context they need to serve all communities
            with equity and accountability.
          </p>

          {/* Stats row */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3.5 hover:border-[#22c55e]/20 hover:bg-[#22c55e]/5 transition-all duration-300">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className="h-3.5 w-3.5 text-[#22c55e]" />
                  <p className="text-[22px] font-black text-zinc-50">{s.value}</p>
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{s.label}</p>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/dashboard" className="group inline-flex h-12 items-center gap-3 rounded-2xl bg-[#22c55e] px-7 text-[14px] font-bold text-white shadow-[0_0_30px_rgba(34,197,94,0.3)] hover:bg-[#16a34a] hover:shadow-[0_0_40px_rgba(34,197,94,0.4)] transition-all duration-300">
              Open Command Centre
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link href="/login" className="inline-flex h-12 items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.04] px-7 text-[14px] font-semibold text-zinc-300 hover:border-[#22c55e]/40 hover:bg-[#22c55e]/10 hover:text-white transition-all duration-300">
              Officer Sign In
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="mt-8 flex items-center gap-5 text-[11px] text-zinc-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-[#22c55e]" />
              No individual profiling
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-[#22c55e]" />
              SHAP explainable
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5 text-[#22c55e]" />
              Audit-logged
            </span>
          </div>
        </div>

        {/* Right: Map */}
        <div className="relative hidden lg:block" style={{ isolation: "isolate" }}>
          {/* Map */}
          <div className="absolute inset-0">
            <LandingMap />
          </div>

          {/* Top-left: Live layer label */}
          <div className="pointer-events-none absolute left-4 top-4 z-[1000]">
            <div className="rounded-2xl border border-white/10 bg-[#0d0f12]/85 px-4 py-3 shadow-[0_4px_24px_rgba(0,0,0,0.5)] backdrop-blur-xl">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500">Live Layer</p>
              <p className="mt-0.5 text-[15px] font-bold text-zinc-100">DBSCAN + KDE · Bihar</p>
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                <span className="text-[10px] text-zinc-400">38 districts active</span>
              </div>
            </div>
          </div>

          {/* Top-right: Privacy badge */}
          <div className="pointer-events-none absolute right-4 top-4 z-[1000]">
            <div className="rounded-2xl border border-[#22c55e]/30 bg-[#22c55e]/10 px-4 py-3 shadow-[0_0_20px_rgba(34,197,94,0.1)] backdrop-blur-xl">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#22c55e]">Privacy-Respecting</p>
              <p className="mt-0.5 text-[13px] font-bold text-[#4ade80]">No Individual Profiling</p>
            </div>
          </div>

          {/* Bottom: District risk cards */}
          <div className="pointer-events-none absolute bottom-6 left-4 right-4 z-[1000] grid grid-cols-3 gap-3">
            {districts.map((d) => {
              const s = levelStyles[d.level];
              return (
                <div key={d.name} className={`flex flex-col items-start rounded-2xl border px-4 py-3.5 backdrop-blur-xl ${s.badge}`}>
                  <div className={`mb-1.5 flex items-center gap-1.5 ${s.dot}`}>
                    <span className="h-1.5 w-1.5 rounded-full" />
                    <span className="text-[9px] font-semibold uppercase tracking-wider">{d.level} risk</span>
                  </div>
                  <span className="text-[15px] font-bold text-zinc-200">{d.name}</span>
                  <div className="mt-1 flex w-full items-end gap-1">
                    <span className={`text-[20px] font-black ${s.score}`}>{d.score}</span>
                    <span className="mb-0.5 text-[9px] font-semibold text-zinc-500">/100</span>
                    {/* Mini risk bar */}
                    <div className="ml-auto h-1.5 w-14 rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full ${d.level === "high" ? "bg-red-500" : d.level === "medium" ? "bg-amber-500" : "bg-green-500"}`}
                        style={{ width: `${d.score}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Edge gradient */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-[#0d0f12] via-transparent to-transparent lg:hidden" />
        </div>
      </section>

      {/* ── Features Grid ───────────────────────────────────── */}
      <section className="relative z-10 border-t border-white/[0.06] bg-gradient-to-b from-[#0d0f12] to-[#0f1215] px-6 py-16 lg:px-12">
        <div className="mx-auto max-w-6xl">
          {/* Section header */}
          <div className="mb-10 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#22c55e]">Core Capabilities</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-zinc-50 lg:text-4xl">
              Built for Accountability
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed text-zinc-500">
              Every feature is designed with transparency, equity, and victim-centred
              principles at its core.
            </p>
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 hover:border-[#22c55e]/25 hover:bg-[#22c55e]/5 transition-all duration-300"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-[#22c55e]/20 bg-[#22c55e]/10">
                  <f.icon className="h-5 w-5" style={{ color: f.accent }} />
                </div>
                <h3 className="text-[15px] font-bold text-zinc-100">{f.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Strip ───────────────────────────────────────── */}
      <section className="relative z-10 overflow-hidden">
        <div className="relative mx-6 mb-10 rounded-3xl border border-[#22c55e]/20 bg-gradient-to-br from-[#052e16] via-[#0d2e1a] to-[#0d0f12] px-8 py-14 text-center lg:mx-12 lg:px-16">
          {/* Glowing orb */}
          <div className="pointer-events-none absolute -right-20 -top-10 h-[300px] w-[300px] rounded-full bg-[#22c55e]/10 blur-[80px]" />
          <div className="pointer-events-none absolute -left-20 -bottom-10 h-[200px] w-[200px] rounded-full bg-[#22c55e]/[0.06] blur-[60px]" />

          <h2 className="relative text-3xl font-black tracking-tight text-zinc-50 lg:text-4xl">
            Ready to Serve Bihar
          </h2>
          <p className="relative mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-zinc-400">
            Join 500+ officers already using data-driven insights to protect and serve.
          </p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/dashboard" className="group inline-flex h-12 items-center gap-3 rounded-2xl bg-[#22c55e] px-8 text-[14px] font-bold text-white shadow-[0_0_30px_rgba(34,197,94,0.3)] hover:bg-[#16a34a] transition-all duration-300">
              Enter Command Centre
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link href="/signup" className="inline-flex h-12 items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.04] px-8 text-[14px] font-semibold text-zinc-300 hover:border-[#22c55e]/40 hover:bg-[#22c55e]/10 hover:text-white transition-all duration-300">
              Request Access
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/[0.06] px-6 py-5 lg:px-12">
        <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#22c55e]" />
            <span className="text-[12px] font-semibold text-zinc-500">
              CrimeIntel · Bihar Police Crime Intelligence System
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-zinc-500">
            <span>© 2026 Bihar Police</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Activity className="h-3 w-3" /> Audit-logged
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Lock className="h-3 w-3" /> Role-gated access
            </span>
            <span>·</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
              Lawful Use Only
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}