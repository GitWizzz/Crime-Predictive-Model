"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  FileText,
  MapPinned,
  Route,
  ShieldCheck,
  Users,
} from "lucide-react";

const LandingMap = dynamic(() => import("@/components/map/LandingMap"), { ssr: false });

const capabilities = [
  {
    icon: MapPinned,
    title: "Community Hotspot Awareness",
    description: "Evidence-based spatial analysis helps officers understand where communities need greater support — without profiling individuals.",
  },
  {
    icon: BarChart3,
    title: "Transparent Forecasting",
    description: "Open, explainable crime-trend predictions with confidence intervals so decisions are always grounded in accountable data.",
  },
  {
    icon: Route,
    title: "Equitable Patrol Coverage",
    description: "Optimised patrol routes ensure all 38 districts receive responsive, proportionate policing — not just high-visibility areas.",
  },
  {
    icon: FileText,
    title: "Structured FIR Processing",
    description: "Structured intake and classification of FIR records improves case continuity, reduces manual error, and supports victim follow-up.",
  },
  {
    icon: Users,
    title: "Victim-Centred Reporting",
    description: "Women safety and vulnerable-group dashboards prioritise the welfare of people affected by crime, not just crime statistics.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy-Respecting by Design",
    description: "Role-based access, audit logs, and anonymised aggregation ensure data is used only for legitimate public-safety purposes.",
  },
];

const pillars = [
  { value: "38", label: "Districts served" },
  { value: "SHAP", label: "Explainable AI" },
  { value: "Audit-logged", label: "Every action" },
  { value: "Victim-first", label: "Design philosophy" },
];

export default function LandingPage() {
  return (
    <main className="flex h-[calc(100vh-64px)] max-h-[calc(100vh-64px)] flex-col overflow-hidden bg-[#0d0f12] text-zinc-100">

      {/* ── Hero split ──────────────────────────────────────────────────── */}
      <div className="grid min-h-0 flex-1 lg:grid-cols-[1fr_1.15fr]">

        {/* Left — copy */}
        <div className="flex flex-col justify-center overflow-hidden px-8 py-4 lg:px-12">

          <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-[#22c55e]/30 bg-[#22c55e]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#22c55e]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
            Evidence-based policing · Bihar
          </div>

          <h1 className="text-[2rem] font-black leading-[1.1] tracking-[-0.03em] text-zinc-50 lg:text-[2.4rem]">
            Safer Communities
            <span className="block text-[#22c55e]">Through Transparent Data</span>
          </h1>

          <p className="mt-3 max-w-lg text-[13px] leading-relaxed text-zinc-400">
            CrimeIntel helps Bihar Police allocate resources fairly, respond faster,
            and report transparently — giving officers the context they need to serve
            all communities with equity and accountability.
          </p>

          {/* Pillars */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            {pillars.map((p) => (
              <div key={p.label} className="rounded-[12px] border border-white/10 bg-white/[0.04] px-3 py-2">
                <p className="text-[15px] font-black text-[#22c55e]">{p.value}</p>
                <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-zinc-500">{p.label}</p>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/dashboard" className="inline-flex h-9 items-center gap-2 rounded-[12px] bg-[#22c55e] px-5 text-[13px] font-bold text-white shadow-lg shadow-[#22c55e]/20 hover:bg-[#16a34a] transition-colors">
              Open Command Centre
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link href="/login" className="inline-flex h-9 items-center gap-2 rounded-[12px] border border-white/12 bg-white/[0.04] px-5 text-[13px] font-semibold text-zinc-300 hover:border-[#22c55e]/40 hover:text-white transition-colors">
              Officer Sign In
            </Link>
          </div>

          {/* Capability mini-grid */}
          <div id="capabilities" className="mt-4 grid grid-cols-2 gap-2.5 border-t border-white/10 pt-4">
            {capabilities.slice(0, 4).map((cap) => (
              <div key={cap.title} className="flex items-start gap-2">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#22c55e]/10">
                  <cap.icon className="h-3 w-3 text-[#22c55e]" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-zinc-100">{cap.title}</p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-zinc-500">{cap.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — live map (isolated stacking context so leaflet z-indices stay inside) */}
        <div className="relative hidden lg:block" style={{ isolation: "isolate" }}>
          <LandingMap />

          {/* Overlay cards */}
          <div className="pointer-events-none absolute left-4 top-4 z-[1000] space-y-2">
            <div className="rounded-[14px] border border-white/10 bg-[#0d0f12]/80 px-3.5 py-2.5 shadow-sm backdrop-blur-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">Live layer</p>
              <p className="mt-0.5 text-[13px] font-bold text-zinc-100">DBSCAN + KDE · Bihar</p>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-6 left-4 right-4 z-[1000] flex gap-3">
            {[
              { name: "Patna", score: 84, tone: "text-red-400 bg-red-950/60 border-red-900/40" },
              { name: "Gaya", score: 71, tone: "text-amber-400 bg-amber-950/60 border-amber-900/40" },
              { name: "Muzaffarpur", score: 63, tone: "text-green-400 bg-green-950/60 border-green-900/40" },
            ].map((zone) => (
              <div key={zone.name} className={`flex flex-1 items-center justify-between rounded-[14px] border px-3.5 py-2.5 backdrop-blur-sm ${zone.tone}`}>
                <span className="text-[13px] font-semibold text-zinc-200">{zone.name}</span>
                <span className={`text-[13px] font-black ${zone.tone.split(" ")[0]}`}>{zone.score}</span>
              </div>
            ))}
          </div>

          {/* Ethics badge */}
          <div id="ethics" className="pointer-events-none absolute right-4 top-4 z-[1000]">
            <div className="rounded-[14px] border border-[#22c55e]/30 bg-[#22c55e]/10 px-3.5 py-2.5 backdrop-blur-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#22c55e]">Privacy-respecting</p>
              <p className="mt-0.5 text-[12px] font-bold text-[#4ade80]">No individual profiling</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="shrink-0 border-t border-white/10 bg-[#0d0f12]/80 px-6 py-3 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500">
          <span>© 2026 Bihar Police Crime Intelligence System · Final Year Project</span>
          <span>Data used solely for lawful public-safety purposes · Audit-logged · Role-gated access</span>
        </div>
      </footer>
    </main>
  );
}
