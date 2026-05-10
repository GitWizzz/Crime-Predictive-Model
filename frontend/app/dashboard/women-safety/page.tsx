"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { GeoJsonObject } from "geojson";
import { Calendar, Info, ShieldAlert, TrendingUp, MapPin, Filter } from "lucide-react";
import { fetchWomenSafety, fetchWomenSafetyFIRs, fetchZoneAnalytics } from "@/services/analytics";
import { fetchZones } from "@/services/zones";

const WomenSafetyMap = dynamic(() => import("@/components/map/WomenSafetyMap"), { ssr: false });

type HeatPoint = { lat: number; lon: number; intensity: number };
type FIRRow = {
  id: number;
  zone?: string | null;
  district?: string | null;
  crime_type?: string;
  date_time?: string;
};
type ZoneRow = { name: string; total: number; category_breakdown?: Record<string, number> };

const DATE_OPTIONS = [
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "Last 6 months", days: 180 },
];

// IPC section categorisation for women safety
const IPC_CATEGORY = (type: string): string => {
  const t = (type || "").toLowerCase();
  if (t.includes("376") || t.includes("rape")) return "Sexual Assault";
  if (t.includes("354a") || t.includes("harassment") || t.includes("stalking") || t.includes("eve")) return "Harassment";
  if (t.includes("354") || t.includes("molestation") || t.includes("outrag")) return "Molestation";
  if (t.includes("498") || t.includes("domestic") || t.includes("cruelty") || t.includes("dowry")) return "Domestic Violence";
  if (t.includes("it 67") || t.includes("cyber") || t.includes("obscene")) return "Cyber Crime";
  return "Other";
};

const CATEGORY_COLOR: Record<string, { bg: string; text: string; bar: string }> = {
  "Sexual Assault":   { bg: "#fee2e2", text: "#dc2626", bar: "#dc2626" },
  "Harassment":       { bg: "#fef3c7", text: "#d97706", bar: "#f59e0b" },
  "Molestation":      { bg: "#fce7f3", text: "#be185d", bar: "#db2777" },
  "Domestic Violence":{ bg: "#ede9fe", text: "#7c3aed", bar: "#8b5cf6" },
  "Cyber Crime":      { bg: "#dbeafe", text: "#1d4ed8", bar: "#3b82f6" },
  "Other":            { bg: "#f1f5f9", text: "#64748b", bar: "#94a3b8" },
};

const HOUR_LABELS = ["12a","2a","4a","6a","8a","10a","12p","2p","4p","6p","8p","10p"];

export default function WomenSafetyPage() {
  const [token] = useState<string | null>(() =>
    typeof window !== "undefined" ? window.localStorage.getItem("authToken") : null
  );
  const [districtsGeo, setDistrictsGeo] = useState<GeoJsonObject | null>(null);
  const [stateBoundary, setStateBoundary] = useState<GeoJsonObject | null>(null);
  const [womenHeatPoints, setWomenHeatPoints] = useState<HeatPoint[]>([]);
  const [firs, setFirs] = useState<FIRRow[]>([]);
  const [districtCounts, setDistrictCounts] = useState<Record<string, number>>({});
  const [dateDays, setDateDays] = useState(90);
  const [showDateMenu, setShowDateMenu] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      const startDate = new Date(Date.now() - dateDays * 86400_000).toISOString().slice(0, 10);

      const [womenRes, firsRes, districtRes, zonesRes] = await Promise.allSettled([
        fetchWomenSafety(token, { startDate }),
        fetchWomenSafetyFIRs(token, { startDate, limit: "200" }),
        fetchZones(token, { type: "DISTRICT" }),
        fetchZoneAnalytics(token, { type: "DISTRICT", startDate }),
      ]);

      if (womenRes.status === "fulfilled") setWomenHeatPoints((womenRes.value.data?.heat_points || []) as HeatPoint[]);
      if (firsRes.status === "fulfilled") setFirs((firsRes.value.data?.items || firsRes.value.data || []) as FIRRow[]);
      if (districtRes.status === "fulfilled") {
        setDistrictsGeo(districtRes.value.data?.geojson || null);
        setStateBoundary(districtRes.value.data?.state_boundary || null);
      }
      if (zonesRes.status === "fulfilled") {
        const zones = (zonesRes.value.data || []) as ZoneRow[];
        const counts: Record<string, number> = {};
        for (const z of zones) {
          const wsCount =
            (z.category_breakdown?.WomenSafety ?? 0) +
            (z.category_breakdown?.["Women Safety"] ?? 0);
          if (wsCount > 0) counts[z.name.toLowerCase().trim()] = wsCount;
        }
        setDistrictCounts(counts);
      }
    };
    load();
  }, [token, dateDays]);

  // IPC category breakdown
  const categoryBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const fir of firs) {
      const cat = IPC_CATEGORY(fir.crime_type || "");
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [firs]);

  // Hour-of-day distribution (bucket into 2-hr slots)
  const hourDistribution = useMemo(() => {
    const buckets = Array(12).fill(0);
    for (const fir of firs) {
      if (!fir.date_time) continue;
      try {
        const h = new Date(fir.date_time).getHours();
        buckets[Math.floor(h / 2)] += 1;
      } catch {}
    }
    return buckets;
  }, [firs]);

  const maxHourCount = Math.max(...hourDistribution, 1);

  // Top zones
  const topZones = useMemo(() => {
    if (!firs.length) return [];
    const counts = firs.reduce<Record<string, number>>((acc, row) => {
      const key = row.zone || row.district || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value }));
  }, [firs]);

  const maxZone = Math.max(...topZones.map(z => z.value), 1);
  const totalIncidents = firs.length || womenHeatPoints.reduce((s, p) => s + Math.max(1, Math.round((p.intensity || 0) * 3)), 0);
  const dateLabel = DATE_OPTIONS.find(o => o.days === dateDays)?.label || "Custom";

  return (
    <div className="mx-auto max-w-[1440px] space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">Women Safety</h1>
          <p className="mt-1 text-[13px] text-[var(--fg-secondary)]">
            IPC sections 354, 354A, 376, 498A and IT Act 67 — incident intelligence
          </p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowDateMenu(v => !v)}
            className="inline-flex h-10 items-center gap-2 rounded-[14px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 text-sm font-medium text-[var(--fg-primary)]"
          >
            <Calendar className="h-4 w-4 text-[var(--fg-tertiary)]" />
            {dateLabel}
          </button>
          {showDateMenu && (
            <div className="absolute right-0 top-12 z-20 rounded-[16px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-1 shadow-lg">
              {DATE_OPTIONS.map(opt => (
                <button
                  key={opt.days}
                  onClick={() => { setDateDays(opt.days); setShowDateMenu(false); }}
                  className={`block w-full rounded-[12px] px-4 py-2 text-left text-sm font-medium hover:bg-[var(--bg-subtle)] ${dateDays === opt.days ? "text-[var(--accent-600)]" : "text-[var(--fg-primary)]"}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-center gap-3 rounded-[18px] border border-purple-100 bg-purple-50 px-4 py-3 dark:border-purple-900/30 dark:bg-purple-950/20">
        <Info className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" />
        <p className="text-[12.5px] text-[var(--fg-primary)]">
          Showing only FIRs flagged as women-safety relevant per IPC 354, 354A, 376, 498A and IT Act 67.
          Heat circles indicate KDE-weighted incident density.
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total FIRs", value: totalIncidents, icon: ShieldAlert, color: "text-purple-600" },
          { label: "Hotspot zones", value: womenHeatPoints.length, icon: MapPin, color: "text-[var(--risk-high)]" },
          { label: "Districts affected", value: Object.keys(districtCounts).length, icon: TrendingUp, color: "text-[var(--risk-medium)]" },
          { label: "Crime categories", value: categoryBreakdown.length, icon: Filter, color: "text-[var(--accent-500)]" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="surface-card rounded-[18px] p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--fg-tertiary)]">{label}</p>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <p className={`mt-2 text-[28px] font-bold tabular-nums leading-none ${color}`}>{value}</p>
            <p className="mt-1 text-[11px] text-[var(--fg-tertiary)]">{dateLabel}</p>
          </div>
        ))}
      </div>

      {/* Map + right panels */}
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">

        {/* Map */}
        <section className="surface-card overflow-hidden rounded-[22px] p-0">
          <div className="border-b border-[var(--border-default)] px-5 py-4">
            <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-[var(--fg-primary)]">
              Incident density map · {dateLabel.toLowerCase()}
            </h2>
            <p className="mt-0.5 text-[12px] text-[var(--fg-tertiary)]">KDE weighted — darker = higher concentration</p>
          </div>
          <div className="relative h-[460px]">
            <WomenSafetyMap
              heatPoints={womenHeatPoints}
              districts={districtsGeo}
              stateBoundary={stateBoundary}
              districtCounts={districtCounts}
            />
          </div>
        </section>

        {/* Right column */}
        <div className="space-y-4">

          {/* IPC category breakdown */}
          <section className="surface-card rounded-[22px] p-5">
            <h2 className="text-[15px] font-semibold text-[var(--fg-primary)]">By crime category</h2>
            <p className="mt-0.5 text-[11px] text-[var(--fg-tertiary)]">IPC section classification</p>
            <div className="mt-4 space-y-2.5">
              {categoryBreakdown.length ? categoryBreakdown.map(([cat, count]) => {
                const tone = CATEGORY_COLOR[cat] || CATEGORY_COLOR.Other;
                return (
                  <div key={cat}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[12px] font-medium text-[var(--fg-secondary)]">{cat}</span>
                      <span className="text-[12px] font-semibold tabular-nums text-[var(--fg-primary)]">{count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${(count / (firs.length || 1)) * 100}%`, background: tone.bar }}
                      />
                    </div>
                  </div>
                );
              }) : (
                <p className="text-sm text-[var(--fg-tertiary)]">No data for period.</p>
              )}
            </div>
          </section>

          {/* Top zones */}
          <section className="surface-card rounded-[22px] p-5">
            <h2 className="text-[15px] font-semibold text-[var(--fg-primary)]">Top districts</h2>
            <div className="mt-4 space-y-2.5">
              {topZones.length ? topZones.map((zone, i) => (
                <div key={zone.name} className="grid grid-cols-[1fr_60px_32px] items-center gap-2 text-[12px]">
                  <span className="truncate text-[var(--fg-secondary)]">{zone.name}</span>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(zone.value / maxZone) * 100}%`,
                        background: i < 2 ? "#dc2626" : i < 4 ? "#d97706" : "#8b5cf6",
                      }}
                    />
                  </div>
                  <span className="text-right font-semibold tabular-nums text-[var(--fg-primary)]">{zone.value}</span>
                </div>
              )) : (
                <p className="text-sm text-[var(--fg-tertiary)]">No data for period.</p>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Time-of-day distribution */}
      {firs.some(f => f.date_time) && (
        <section className="surface-card rounded-[22px] p-5">
          <h2 className="text-[15px] font-semibold text-[var(--fg-primary)]">Time-of-day pattern</h2>
          <p className="mt-0.5 text-[12px] text-[var(--fg-tertiary)]">When incidents are most reported (2-hour buckets)</p>
          <div className="mt-5 flex items-end gap-1.5 h-24">
            {hourDistribution.map((count, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-sm transition-all duration-500"
                  style={{
                    height: `${Math.max(4, (count / maxHourCount) * 80)}px`,
                    background: i >= 5 && i <= 9
                      ? "#dc2626"
                      : i >= 4 && i <= 10
                        ? "#d97706"
                        : "#8b5cf6",
                    opacity: count === 0 ? 0.15 : 1,
                  }}
                />
                <span className="text-[9px] text-[var(--fg-tertiary)]">{HOUR_LABELS[i]}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-4 text-[11px] text-[var(--fg-tertiary)]">
            <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-3 rounded-sm bg-[#dc2626]" />Peak hours</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-3 rounded-sm bg-[#d97706]" />Elevated</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-3 rounded-sm bg-[#8b5cf6]" />Normal</span>
          </div>
        </section>
      )}
    </div>
  );
}
