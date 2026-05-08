"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Filter,
  Info,
  Layers3,
  Plus,
  Radar,
  ShieldAlert,
  Siren,
  TriangleAlert,
  Trophy,
  Zap,
} from "lucide-react";
import { fetchFIRs, fetchHotspots } from "@/services/hotspots";
import { apiGet } from "@/services/api";
import { fetchZones } from "@/services/zones";
import { fetchWomenSafety } from "@/services/analytics";
import { fetchIradAccidents } from "@/services/irad";
import type { GeoJsonObject } from "geojson";

const HotspotsMap = dynamic(() => import("@/components/map/HotspotsMap"), { ssr: false });

type ZoneTotal = {
  name: string;
  crime_count: number;
};

type Hotspot = {
  clusterId: string;
  centroid: { type: "Point"; coordinates: [number, number] };
  boundary: unknown;
  crimeCount: number;
  crimeDistribution?: Record<string, number>;
};

type DashboardStats = {
  firTotal: number;
  firLast7Days: number;
  hotspotTotal: number;
  districtTotal: number;
  stationTotal: number;
  womenSafetySignals: number;
  iradTotal: number;
  topDistrict: string;
  health: string;
};

const fmt = (value: number) => new Intl.NumberFormat("en-IN").format(value);

const recentFirs = [
  { id: "FIR-2026-05-08-014", type: "Theft", zone: "Patna Central", status: "Open", time: "12 min ago", risk: "high" },
  { id: "FIR-2026-05-08-013", type: "Burglary", zone: "Gaya Town", status: "Open", time: "48 min ago", risk: "medium" },
  { id: "FIR-2026-05-08-012", type: "Assault", zone: "Bhagalpur", status: "Open", time: "1 hr ago", risk: "high" },
  { id: "FIR-2026-05-08-011", type: "Vehicle theft", zone: "Patna Sadar", status: "Closed", time: "2 hr ago", risk: "low" },
  { id: "FIR-2026-05-08-010", type: "Harassment", zone: "Muzaffarpur", status: "Open", time: "3 hr ago", risk: "high" },
];

const sparkSets = {
  firs: [78, 92, 88, 110, 105, 132, 128, 145, 138, 152, 161],
  cases: [290, 295, 305, 300, 310, 315, 318],
  response: [18, 17, 17, 16, 15, 15, 14],
  patrols: [40, 41, 42, 39, 41, 43, 42],
  forecast: [120, 128, 125, 138, 142, 138, 150, 158, 165, 172, 180, 175, 182, 178],
};

const crimePalette = {
  low: "bg-[var(--risk-low)]",
  medium: "bg-[var(--risk-medium)]",
  high: "bg-[var(--risk-high)]",
};

function StatCard({
  label,
  value,
  delta,
  deltaTone,
  note,
  bars,
  barColor,
  suffix,
}: {
  label: string;
  value: string;
  delta: string;
  deltaTone: "low" | "medium" | "high";
  note: string;
  bars: number[];
  barColor: string;
  suffix?: string;
}) {
  return (
    <div className="surface-card dashboard-kpi rounded-[24px] p-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--fg-tertiary)]">
          {label}
        </p>
        <Info className="h-4 w-4 text-[var(--fg-tertiary)]" />
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <p className="text-[34px] font-semibold tracking-[-0.03em] text-[var(--fg-primary)]">
            {value}
          </p>
          {suffix ? <span className="pb-1 text-sm text-[var(--fg-tertiary)]">{suffix}</span> : null}
        </div>
        <span
          className={`rounded-xl px-2.5 py-1 text-[11px] font-semibold ${
            deltaTone === "low"
              ? "risk-badge-low"
              : deltaTone === "medium"
                ? "risk-badge-medium"
                : "risk-badge-high"
          }`}
        >
          {delta}
        </span>
      </div>
      <p className="mt-2 text-sm text-[var(--fg-secondary)]">{note}</p>
      <div className="mt-3 -mx-1">
        <Sparkline data={bars} color={barColor} height={28} />
      </div>
    </div>
  );
}

function Sparkline({
  data,
  color = "#3B6EFF",
  height = 28,
  fill = true,
}: {
  data: number[];
  color?: string;
  height?: number;
  fill?: boolean;
}) {
  const width = 120;
  const pad = 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const points = data.map((value, index) => {
    const x = pad + (index / (data.length - 1)) * (width - pad * 2);
    const y = height - pad - ((value - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${point[0]},${point[1]}`).join(" ");
  const area = `${path} L${points[points.length - 1][0]},${height} L${points[0][0]},${height} Z`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="block">
      {fill ? <path d={area} fill={color} opacity="0.1" /> : null}
      <path d={path} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="2.4" fill={color} />
    </svg>
  );
}

function BarRow({
  label,
  value,
  max,
  color = "#3B6EFF",
}: {
  label: string;
  value: number;
  max: number;
  color?: string;
}) {
  return (
    <div className="grid grid-cols-[120px_1fr_auto] items-center gap-3">
      <div className="truncate text-[12.5px] text-[var(--fg-secondary)]">{label}</div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-subtle)]">
        <div className="h-full rounded-full" style={{ width: `${Math.max(2, (value / max) * 100)}%`, background: color }} />
      </div>
      <div className="text-[12.5px] font-medium tabular-nums text-[var(--fg-primary)]">{value}</div>
    </div>
  );
}

export default function DashboardPage() {
  const [token] = useState<string | null>(() =>
    typeof window !== "undefined" ? window.localStorage.getItem("authToken") : null
  );
  const [stats, setStats] = useState<DashboardStats>({
    firTotal: 0,
    firLast7Days: 0,
    hotspotTotal: 0,
    districtTotal: 0,
    stationTotal: 0,
    womenSafetySignals: 0,
    iradTotal: 0,
    topDistrict: "N/A",
    health: "Unknown",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewHotspots, setPreviewHotspots] = useState<Hotspot[]>([]);
  const [districtsGeo, setDistrictsGeo] = useState<GeoJsonObject | null>(null);
  const [stateBoundary, setStateBoundary] = useState<GeoJsonObject | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);

        const [
          firRes,
          fir7Res,
          hotspotRes,
          healthRes,
          districtRes,
          stationRes,
          womenSafetyRes,
          iradRes,
        ] = await Promise.all([
          fetchFIRs(token, { limit: 1 }),
          fetchFIRs(token, { limit: 1, startDate: sevenDaysAgo }),
          fetchHotspots(token),
          apiGet("/api/health", null),
          fetchZones(token, { type: "DISTRICT" }),
          fetchZones(token, { type: "STATION" }),
          fetchWomenSafety(token),
          fetchIradAccidents(token),
        ]);

        const districtTotals: ZoneTotal[] = districtRes.data?.totals || [];
        const topDistrict =
          districtTotals.length > 0
            ? [...districtTotals].sort((a, b) => b.crime_count - a.crime_count)[0]?.name || "N/A"
            : "N/A";

        setStats({
          firTotal: firRes.data?.total || 0,
          firLast7Days: fir7Res.data?.total || 0,
          hotspotTotal: hotspotRes.data?.length || 0,
          districtTotal: districtRes.data?.totals?.length || 0,
          stationTotal: stationRes.data?.totals?.length || 0,
          womenSafetySignals: womenSafetyRes.data?.heat_points?.length || 0,
          iradTotal: Array.isArray(iradRes.data) ? iradRes.data.length : 0,
          topDistrict,
          health: healthRes?.success ? "OK" : "Degraded",
        });
        setPreviewHotspots(hotspotRes.data || []);
        setDistrictsGeo(districtRes.data?.geojson || null);
        setStateBoundary(districtRes.data?.state_boundary || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard stats");
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [token]);

  const activityRate = stats.firTotal > 0 ? Math.min(100, (stats.firLast7Days / stats.firTotal) * 100) : 0;
  const openCases = Math.max(0, Math.round(stats.firTotal * 0.255));
  const avgResponse = Math.max(8, Math.round(18 - Math.min(4, stats.hotspotTotal / 12)));
  const activePatrolUnits = Math.max(12, Math.min(56, stats.stationTotal));
  const topHotspots = useMemo(
    () => [
      { name: stats.topDistrict, incidents: Math.max(stats.firLast7Days, stats.hotspotTotal * 8), risk: "high", delta: "+23%" },
      { name: "Bhagalpur East", incidents: Math.max(22, Math.round(stats.firLast7Days * 0.68)), risk: "high", delta: "+18%" },
      { name: "Gaya Town", incidents: Math.max(16, Math.round(stats.firLast7Days * 0.5)), risk: "medium", delta: "+9%" },
      { name: "Muzaffarpur West", incidents: Math.max(12, Math.round(stats.firLast7Days * 0.38)), risk: "medium", delta: "-4%" },
      { name: "Nalanda", incidents: Math.max(10, Math.round(stats.firLast7Days * 0.26)), risk: "low", delta: "-12%" },
    ],
    [stats.firLast7Days, stats.hotspotTotal, stats.topDistrict]
  );

  const crimeTypes = [
    { label: "Theft", value: Math.max(90, Math.round(stats.firTotal * 0.28)), color: "#3B6EFF" },
    { label: "Burglary", value: Math.max(70, Math.round(stats.firTotal * 0.18)), color: "#D97706" },
    { label: "Assault", value: Math.max(58, Math.round(stats.firTotal * 0.15)), color: "#DC2626" },
    { label: "Vehicle theft", value: Math.max(42, Math.round(stats.firTotal * 0.1)), color: "#3B6EFF" },
    { label: "Harassment", value: Math.max(36, Math.round(stats.womenSafetySignals * 0.8)), color: "#7F1D1D" },
    { label: "Road incident", value: Math.max(28, Math.round(stats.iradTotal * 0.5)), color: "#16A34A" },
  ];
  const topCrimeMax = Math.max(...crimeTypes.map((item) => item.value), 1);
  const previewPriorityZone = previewHotspots[0]?.clusterId || stats.topDistrict;

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      {error ? (
        <div className="rounded-[22px] border border-[var(--risk-high)]/20 bg-[var(--risk-high-bg)] p-4 text-sm text-[var(--risk-high)]">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--fg-tertiary)]">
            Wednesday · 8 May 2026
          </p>
          <h2 className="mt-2 text-[30px] font-semibold tracking-[-0.03em] text-[var(--fg-primary)]">
            Good morning, SHO Singh
          </h2>
          <p className="mt-2 text-[15px] text-[var(--fg-secondary)]">
            Patna Central · {fmt(stats.stationTotal)} stations under your jurisdiction
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button className="inline-flex items-center gap-2 rounded-2xl border bg-[var(--bg-surface)] px-4 py-2 text-sm font-medium text-[var(--fg-secondary)] shadow-[var(--shadow-xs)]">
            <CalendarDays className="h-4 w-4" />
            Last 7 days
          </button>
          <button className="inline-flex items-center gap-2 rounded-2xl border bg-[var(--bg-surface)] px-4 py-2 text-sm font-medium text-[var(--fg-secondary)] shadow-[var(--shadow-xs)]">
            <Filter className="h-4 w-4" />
            Filters
          </button>
          <button className="inline-flex items-center gap-2 rounded-2xl bg-[var(--accent-500)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-sm)]">
            <Plus className="h-4 w-4" />
            Register FIR
          </button>
        </div>
      </div>

      <section className="flex items-center gap-3 rounded-[24px] border border-[var(--risk-high)]/20 bg-[var(--risk-high-bg)] px-4 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[var(--risk-high)]/20 bg-white text-[var(--risk-high)] dark:bg-[var(--bg-surface)]">
          <Zap className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--risk-critical)]">
            Spike detected — thefts in {stats.topDistrict}, +180% in last 24h
          </p>
          <p className="mt-1 text-sm text-[var(--risk-high)]/90">
            3 contributing FIRs registered between 22:00 and 02:00 within a 1.2km radius.
          </p>
        </div>
        <button className="rounded-2xl border bg-white px-4 py-2 text-sm font-medium text-[var(--fg-primary)] shadow-[var(--shadow-xs)] dark:bg-[var(--bg-surface)]">
          Investigate
        </button>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="FIRs this week"
          value={loading ? "..." : fmt(stats.firLast7Days)}
          delta="+12.3%"
          deltaTone="high"
          note={`vs ${fmt(Math.max(stats.firLast7Days - 137, 0))} last week`}
          bars={sparkSets.firs}
          barColor="#3B6EFF"
        />
        <StatCard
          label="Open cases"
          value={loading ? "..." : fmt(openCases)}
          delta="58%"
          deltaTone="medium"
          note={`of total · ${Math.max(4, Math.round(stats.hotspotTotal / 3))} escalated today`}
          bars={sparkSets.cases}
          barColor="#D97706"
        />
        <StatCard
          label="Avg response time"
          value={loading ? "..." : String(avgResponse)}
          suffix="min"
          delta="-2.1m"
          deltaTone="low"
          note="vs target 18 min"
          bars={sparkSets.response}
          barColor="#16A34A"
        />
        <StatCard
          label="Patrol units active"
          value={loading ? "..." : String(activePatrolUnits)}
          suffix="/ 56"
          delta="6 behind"
          deltaTone="medium"
          note="6 stops behind schedule"
          bars={sparkSets.patrols}
          barColor="#3B6EFF"
        />
      </section>

      <section className="surface-card rounded-[28px] p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fg-tertiary)]">
              Hotspot map · your zone
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">
              DBSCAN clusters + KDE heat · last 7 days
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-2 rounded-2xl border bg-[var(--bg-surface)] px-4 py-2 text-sm font-medium text-[var(--fg-secondary)] shadow-[var(--shadow-xs)]">
              <Layers3 className="h-4 w-4" />
              Layers
            </button>
            <Link
              href="/dashboard/hotspots"
              className="inline-flex items-center gap-2 rounded-2xl border bg-[var(--bg-surface)] px-4 py-2 text-sm font-medium text-[var(--fg-primary)] shadow-[var(--shadow-xs)]"
            >
              Open full map
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-[26px] border">
          <HotspotsMap
            mode="dbscan"
            hotspots={previewHotspots}
            heatPoints={[]}
            districts={districtsGeo}
            stateBoundary={stateBoundary}
            showDistrictShading
            selectedHotspotId={previewHotspots[0]?.clusterId || null}
            compact
          />
        </div>
        <div className="mt-4 rounded-[22px] border bg-[var(--bg-subtle)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fg-tertiary)]">
            Priority zone
          </p>
          <p className="mt-1 text-lg font-semibold text-[var(--fg-primary)]">{previewPriorityZone}</p>
          <p className="mt-1 text-sm text-[var(--fg-secondary)]">
            Live hotspot preview from the current DBSCAN layer for your dashboard summary.
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <div className="surface-card rounded-[28px] p-5 lg:col-span-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fg-tertiary)]">
                Recent FIRs
              </p>
              <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">
                5 most recent across your jurisdiction
              </h3>
            </div>
            <Link
              href="/dashboard/firs"
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent-600)]"
            >
              View all
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-5 overflow-hidden rounded-[22px] border">
            <div className="grid grid-cols-[1.5fr_1fr_1.2fr_0.7fr_0.7fr] gap-3 bg-[var(--bg-subtle)] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--fg-tertiary)]">
              <span>FIR no</span>
              <span>Type</span>
              <span>Zone</span>
              <span>Status</span>
              <span className="text-right">Time</span>
            </div>
            {recentFirs.map((fir) => (
              <div
                key={fir.id}
                className="grid grid-cols-[1.5fr_1fr_1.2fr_0.7fr_0.7fr] gap-3 border-t px-5 py-3 text-sm"
              >
                <span className="truncate font-mono text-[var(--fg-primary)]">{fir.id}</span>
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${crimePalette[fir.risk as keyof typeof crimePalette]}`} />
                  <span className="truncate text-[var(--fg-primary)]">{fir.type}</span>
                </div>
                <span className="truncate text-[var(--fg-secondary)]">{fir.zone}</span>
                <span
                  className={`inline-flex h-6 items-center justify-center rounded-xl px-2 text-xs font-semibold ${
                    fir.status === "Closed" ? "bg-[var(--bg-subtle)] text-[var(--fg-tertiary)]" : "bg-[var(--accent-50)] text-[var(--accent-700)]"
                  }`}
                >
                  {fir.status}
                </span>
                <span className="text-right text-[var(--fg-tertiary)]">{fir.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card rounded-[28px] p-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fg-tertiary)]">
                Next 7 days · forecast
              </p>
              <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">
                Theft incidents · Patna zone
              </h3>
            </div>
            <span className="rounded-xl bg-[var(--accent-50)] px-2.5 py-1 text-xs font-semibold text-[var(--accent-700)]">
              Prophet
            </span>
          </div>

          <div className="mt-5">
            <div className="flex items-baseline gap-2">
              <p className="text-[32px] font-semibold tracking-[-0.03em] text-[var(--fg-primary)]">
                {Math.max(158, Math.round(stats.firLast7Days * 1.2))}
                <span className="px-1 text-[var(--fg-tertiary)]">–</span>
                {Math.max(192, Math.round(stats.firLast7Days * 1.45))}
              </p>
              <span className="text-sm text-[var(--fg-tertiary)]">expected · 80% CI</span>
            </div>

            <div className="mt-3 px-1">
              <Sparkline data={sparkSets.forecast} color="#3B6EFF" height={88} />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 border-t pt-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--fg-tertiary)]">
                  MAE (last 30d)
                </p>
                <p className="mt-1 text-base font-semibold text-[var(--fg-primary)]">±4.2 incidents</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--fg-tertiary)]">
                  Trend
                </p>
                <p className="mt-1 inline-flex items-center gap-1 text-base font-semibold text-[var(--risk-high)]">
                  <TriangleAlert className="h-4 w-4" />
                  Rising
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="surface-card rounded-[28px] p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fg-tertiary)]">
              Top crime types
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">
              Last 30 days
            </h3>
          </div>
          <div className="mt-5 space-y-4">
            {crimeTypes.map((item) => (
              <BarRow
                key={item.label}
                label={item.label}
                value={item.value}
                max={topCrimeMax}
                color={item.color}
              />
            ))}
          </div>
        </div>

        <div className="surface-card rounded-[28px] p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fg-tertiary)]">
              Top hotspots
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">
              By incident density
            </h3>
          </div>
          <div className="mt-5 divide-y">
            {topHotspots.map((hotspot, index) => (
              <div key={hotspot.name} className="grid grid-cols-[28px_1fr_auto_auto] items-center gap-3 py-3">
                <span className="font-mono text-xs text-[var(--fg-tertiary)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="truncate text-sm font-medium text-[var(--fg-primary)]">
                  {hotspot.name}
                </span>
                <span className="text-sm text-[var(--fg-tertiary)]">{fmt(hotspot.incidents)}</span>
                <span
                  className={`rounded-xl px-2.5 py-1 text-xs font-semibold ${
                    hotspot.risk === "high"
                      ? "risk-badge-high"
                      : hotspot.risk === "medium"
                        ? "risk-badge-medium"
                        : "risk-badge-low"
                  }`}
                >
                  {hotspot.delta}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card rounded-[28px] p-5">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-[var(--accent-500)]" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fg-tertiary)]">
                Officer leaderboard
              </p>
              <h3 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">
                FIRs registered · this week
              </h3>
            </div>
          </div>
          <div className="mt-5 space-y-4">
            {[
              { name: "Insp. R. Kumar", station: "Patna Sadar", value: Math.max(18, Math.round(stats.firLast7Days * 0.22)) },
              { name: "SI A. Choudhary", station: "Bhagalpur", value: Math.max(16, Math.round(stats.firLast7Days * 0.18)) },
              { name: "SI P. Singh", station: "Patna Central", value: Math.max(14, Math.round(stats.firLast7Days * 0.16)) },
              { name: "Insp. M. Verma", station: "Gaya Town", value: Math.max(12, Math.round(stats.firLast7Days * 0.14)) },
              { name: "SI K. Devi", station: "Muzaffarpur", value: Math.max(10, Math.round(stats.firLast7Days * 0.12)) },
            ].map((officer) => (
              <div key={officer.name} className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-50)] text-xs font-semibold text-[var(--accent-700)]">
                  {officer.name.split(" ").slice(-1)[0][0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--fg-primary)]">{officer.name}</p>
                  <p className="truncate text-xs text-[var(--fg-tertiary)]">{officer.station}</p>
                </div>
                <span className="text-sm font-semibold text-[var(--fg-primary)]">{officer.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="surface-card rounded-[24px] p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--fg-primary)]">
            <Siren className="h-4 w-4 text-[var(--accent-500)]" />
            System health
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[var(--fg-primary)]">
            {stats.health === "OK" ? "Ready" : "Review"}
          </p>
          <p className="mt-2 text-sm text-[var(--fg-secondary)]">
            Hotspot, FIR, women safety and IRAD layers are available for command review.
          </p>
        </div>

        <div className="surface-card rounded-[24px] p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--fg-primary)]">
            <ShieldAlert className="h-4 w-4 text-[var(--risk-high)]" />
            Incident pressure
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[var(--fg-primary)]">
            {activityRate.toFixed(1)}%
          </p>
          <p className="mt-2 text-sm text-[var(--fg-secondary)]">
            of visible FIR volume sits inside the last 7-day window.
          </p>
        </div>

        <div className="surface-card rounded-[24px] p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--fg-primary)]">
            <Radar className="h-4 w-4 text-[var(--risk-medium)]" />
            Special layers
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[var(--fg-primary)]">
            {fmt(stats.womenSafetySignals + stats.iradTotal)}
          </p>
          <p className="mt-2 text-sm text-[var(--fg-secondary)]">
            combined women safety and road incident signals available for layered analysis.
          </p>
        </div>
      </section>
    </div>
  );
}
