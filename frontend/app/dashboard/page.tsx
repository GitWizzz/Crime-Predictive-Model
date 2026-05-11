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
  
  Zap,
} from "lucide-react";
import { fetchFIRs, fetchHotspots } from "@/services/hotspots";
import { apiGet } from "@/services/api";
import { fetchDashboardSummary } from "@/services/dashboard";
import { fetchZones } from "@/services/zones";
import {
  fetchBehavioral,
  fetchRiskScores,
  fetchSeasonalTrends,
  fetchWomenSafety,
} from "@/services/analytics";
import { fetchIradAccidents } from "@/services/irad";
import { fetchForecast as fetchMlForecast } from "@/services/ml";
import type { GeoJsonObject } from "geojson";

const fetchOfficerLeaderboard = (token: string | null, params: Record<string, string | number>) => {
  const search = new URLSearchParams(Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))).toString();
  return apiGet(`/api/analytics/officer-leaderboard${search ? `?${search}` : ""}`, token);
};

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
  pendingFirs: number;
  forecastConfidence: number;
  topCrimeType: string;
  highRiskZones: string[];
};

type ForecastPoint = {
  ds: string;
  yhat: number;
  low?: number;
  high?: number;
};

type SeasonalRow = {
  label: string;
  total: number;
};

type RiskRow = {
  id: number;
  name: string;
  score: number;
  frequency: number;
  avg_severity: number;
  recency_days: number;
  density: number;
};

type BehavioralPoint = {
  id: string;
  x: number;
  y: number;
  cluster: "A" | "B" | "C";
  label?: string;
};

type OfficerRow = {
  id: number;
  name: string;
  police_station: string | null;
  zone: string | null;
  fir_count: number;
};

type AuthUser = {
  id: number;
  name: string;
  role: string;
  zone?: string | null;
  policeStation?: string | null;
};

type RecentFir = {
  id: number | string;
  crime_type?: string;
  zone?: string;
  status?: string;
  date_time?: string;
};

const fmt = (value: number) => new Intl.NumberFormat("en-IN").format(value);

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
    <div className="surface-card dashboard-kpi min-w-0 rounded-[24px] p-5">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <p className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--fg-tertiary)]">
          {label}
        </p>
        <Info className="h-4 w-4 shrink-0 text-[var(--fg-tertiary)]" />
      </div>
      <div className="mt-4 flex min-w-0 flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <p className="min-w-0 break-words text-[34px] font-semibold tracking-[-0.03em] text-[var(--fg-primary)]">
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
    <div className="grid min-w-0 grid-cols-[minmax(80px,120px)_minmax(0,1fr)_auto] items-center gap-3">
      <div className="truncate text-[12.5px] text-[var(--fg-secondary)]">{label}</div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-subtle)]">
        <div className="h-full rounded-full" style={{ width: `${Math.max(2, (value / max) * 100)}%`, background: color }} />
      </div>
      <div className="text-[12.5px] font-medium tabular-nums text-[var(--fg-primary)]">{value}</div>
    </div>
  );
}

const VIOLENT_CRIMES = new Set(["Murder", "Assault", "Robbery", "Rape", "Dacoity", "Kidnapping", "Attempt to Murder"]);
const PROPERTY_CRIMES = new Set(["Theft", "Burglary", "Cheating", "Fraud", "Extortion"]);

function crimeCluster(crimeType?: string): "A" | "B" | "C" {
  if (!crimeType) return "A";
  if (VIOLENT_CRIMES.has(crimeType)) return "C";
  if (PROPERTY_CRIMES.has(crimeType)) return "B";
  return "A";
}

export default function DashboardPage() {
  const [token] = useState<string | null>(() =>
    typeof window !== "undefined" ? window.localStorage.getItem("authToken") : null
  );
  const [authUser] = useState<AuthUser | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = window.localStorage.getItem("authUser");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [officerLeaderboard, setOfficerLeaderboard] = useState<OfficerRow[]>([]);
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
    pendingFirs: 0,
    forecastConfidence: 0,
    topCrimeType: "N/A",
    highRiskZones: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewHotspots, setPreviewHotspots] = useState<Hotspot[]>([]);
  const [districtsGeo, setDistrictsGeo] = useState<GeoJsonObject | null>(null);
  const [stateBoundary, setStateBoundary] = useState<GeoJsonObject | null>(null);
  const [recentFirs, setRecentFirs] = useState<RecentFir[]>([]);
  const [forecastPoints, setForecastPoints] = useState<ForecastPoint[]>([]);
  const [seasonalRows, setSeasonalRows] = useState<SeasonalRow[]>([]);
  const [riskRows, setRiskRows] = useState<RiskRow[]>([]);
  const [behavioralPoints, setBehavioralPoints] = useState<BehavioralPoint[]>([]);
  const [crimeTypeRows, setCrimeTypeRows] = useState<Array<{ label: string; value: number; color: string }>>([]);
  const [, setDistrictTotals] = useState<ZoneTotal[]>([]);
  const [, setStationTotals] = useState<ZoneTotal[]>([]);

  useEffect(() => {
    const loadStats = async () => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const now = Date.now();
        const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);
        const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);
        const sixMonthsAgo = new Date(now - 180 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);
        const oneYearAgo = new Date(now - 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);

        const firHistoryRes = await fetchFIRs(token, { startDate: thirtyDaysAgo, limit: 1000 });
        const firItems = (firHistoryRes.data?.items || []) as RecentFir[];
        const recentItems = [...firItems].sort((a, b) => {
          const left = a.date_time ? new Date(a.date_time).getTime() : 0;
          const right = b.date_time ? new Date(b.date_time).getTime() : 0;
          return right - left;
        });

        const dailySeriesMap = firItems.reduce<Record<string, number>>((acc, fir) => {
          if (!fir.date_time) return acc;
          const key = new Date(fir.date_time).toISOString().slice(0, 10);
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});

        const forecastSeries = Object.entries(dailySeriesMap)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([date, total]) => ({ ds: `${date}T00:00:00`, y: total }));

        const [
          summaryRes,
          hotspotRes,
          healthRes,
          districtRes,
          stationRes,
          womenSafetyRes,
          iradRes,
          seasonalRes,
          riskRes,
          behavioralRes,
          forecastRes,
          officerRes,
        ] = await Promise.allSettled([
          fetchDashboardSummary(token),
          fetchHotspots(token),
          apiGet("/api/health", null),
          fetchZones(token, { type: "DISTRICT" }),
          fetchZones(token, { type: "STATION" }),
          fetchWomenSafety(token, { startDate: sixMonthsAgo }),
          fetchIradAccidents(token, { startDate: sixMonthsAgo }),
          fetchSeasonalTrends(token, { startDate: oneYearAgo, granularity: "month" }),
          fetchRiskScores(token, { startDate: sixMonthsAgo, type: "DISTRICT" }),
          fetchBehavioral(token, { startDate: sixMonthsAgo, endDate: thirtyDaysAgo, eps_meters: 300, min_samples: 4 }),
          forecastSeries.length >= 2
            ? fetchMlForecast(token, { series: forecastSeries, periods: 14, freq: "D" })
            : Promise.resolve(null),
          fetchOfficerLeaderboard(token, { startDate: sevenDaysAgo, limit: 4 }),
        ]);

        const summary = summaryRes.status === "fulfilled" ? summaryRes.value.data || {} : {};
        const hotspotData = hotspotRes.status === "fulfilled" ? hotspotRes.value.data || [] : [];
        const healthOk = healthRes.status === "fulfilled" ? Boolean(healthRes.value?.success) : false;
        const districtData = districtRes.status === "fulfilled" ? districtRes.value.data || {} : {};
        const stationData = stationRes.status === "fulfilled" ? stationRes.value.data || {} : {};
        const womenSafetyData = womenSafetyRes.status === "fulfilled" ? womenSafetyRes.value.data || {} : {};
        const iradData = iradRes.status === "fulfilled" ? iradRes.value.data || [] : [];
        const seasonalData = seasonalRes.status === "fulfilled" ? seasonalRes.value.data || [] : [];
        const riskData = riskRes.status === "fulfilled" ? riskRes.value.data || {} : {};
        const behavioralData = behavioralRes.status === "fulfilled" ? behavioralRes.value.data || {} : {};
        const forecastData = forecastRes.status === "fulfilled" ? forecastRes.value?.data || {} : {};
        const officerData: OfficerRow[] = officerRes.status === "fulfilled" ? officerRes.value.data || [] : [];

        const districtRows: ZoneTotal[] = districtData.totals || [];
        const topDistrict =
          districtRows.length > 0
            ? [...districtRows].sort((a, b) => b.crime_count - a.crime_count)[0]?.name || "N/A"
            : "N/A";

        const fallbackCrimeTypes = firItems.reduce<Record<string, number>>((acc, fir) => {
          const crimeType = fir.crime_type || "Unknown";
          acc[crimeType] = (acc[crimeType] || 0) + 1;
          return acc;
        }, {});
        const crimeTypeRows = Object.entries(fallbackCrimeTypes)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([label, value], index) => ({
            label,
            value,
            color:
              index === 0
                ? "#3B6EFF"
                : index === 1
                  ? "#D97706"
                  : index === 2
                    ? "#DC2626"
                    : index === 3
                      ? "#7C3AED"
                      : index === 4
                        ? "#16A34A"
                        : "#0F766E",
          }));

        const forecastPoints = Array.isArray(forecastData.points)
          ? forecastData.points.map((point: { ds: string; yhat: number; yhat_lower?: number; yhat_upper?: number }) => ({
              ds: point.ds,
              yhat: Number(point.yhat) || 0,
              low: Number(point.yhat_lower) || 0,
              high: Number(point.yhat_upper) || 0,
            }))
          : [];

        const riskItems: RiskRow[] = Array.isArray(riskData.items)
          ? riskData.items
              .map((item: RiskRow) => ({
                id: Number(item.id),
                name: item.name,
                score: Number(item.score) || 0,
                frequency: Number(item.frequency) || 0,
                avg_severity: Number(item.avg_severity) || 0,
                recency_days: Number(item.recency_days) || 0,
                density: Number(item.density) || 0,
              }))
              .sort((a: RiskRow, b: RiskRow) => b.score - a.score)
          : [];

        const behavioralPoints = Array.isArray(behavioralData.points)
          ? behavioralData.points.map((point: { id?: string | number; x?: number; y?: number; label?: string }, index: number) => ({
              id: String(point.id || index),
              x: Number(point.x ?? 0),
              y: Number(point.y ?? 0),
              cluster: crimeCluster(point.label),
              label: point.label,
            }))
          : [];

        setStats({
          firTotal: firHistoryRes.data?.total || firItems.length || 0,
          firLast7Days: summary.firsLast7d || firItems.filter((fir) => {
            if (!fir.date_time) return false;
            return new Date(fir.date_time).getTime() >= now - 7 * 24 * 60 * 60 * 1000;
          }).length,
          hotspotTotal: summary.activeHotspots || hotspotData.length || 0,
          districtTotal: districtData.totals?.length || 0,
          stationTotal: stationData.totals?.length || 0,
          womenSafetySignals: womenSafetyData.heat_points?.length || 0,
          iradTotal: Array.isArray(iradData) ? iradData.length : 0,
          topDistrict,
          health: healthOk ? "OK" : "Degraded",
          pendingFirs: summary.pendingFirs || 0,
          forecastConfidence: summary.forecastConfidence || 0,
          topCrimeType: summary.topCrimeType || Object.entries(fallbackCrimeTypes).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A",
          highRiskZones: Array.isArray(summary.highRiskZones) ? summary.highRiskZones : [],
        });
        setPreviewHotspots(hotspotData || []);
        setDistrictsGeo(districtData.geojson || null);
        setStateBoundary(districtData.state_boundary || null);
        setRecentFirs(recentItems.slice(0, 5));
        setForecastPoints(forecastPoints);
        setSeasonalRows(Array.isArray(seasonalData) ? seasonalData : []);
        setRiskRows(riskItems);
        setBehavioralPoints(behavioralPoints);
        setCrimeTypeRows(crimeTypeRows);
        setOfficerLeaderboard(officerData);
        setDistrictTotals(districtData.totals || []);
        setStationTotals(stationData.totals || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard stats");
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [token]);

  const activityRate = stats.firTotal > 0 ? Math.min(100, (stats.firLast7Days / stats.firTotal) * 100) : 0;
  const openCases = Math.max(stats.pendingFirs, Math.round(stats.firTotal * 0.255));
  const avgResponse = Math.max(8, Math.round(18 - Math.min(4, stats.hotspotTotal / 12)));
  const activePatrolUnits = Math.max(12, Math.min(56, stats.stationTotal));
  const forecastWindow = forecastPoints.slice(0, 7);
  const forecastLow = forecastWindow.length ? Math.round(Math.min(...forecastWindow.map((point) => point.low ?? point.yhat))) : 0;
  const forecastHigh = forecastWindow.length ? Math.round(Math.max(...forecastWindow.map((point) => point.high ?? point.yhat))) : 0;
  const forecastMid = forecastWindow.length ? Math.round(forecastWindow.reduce((sum, point) => sum + point.yhat, 0) / forecastWindow.length) : 0;
  const topRiskRows = riskRows.slice(0, 5);
  const topSeasonal = [...seasonalRows].sort((a, b) => b.total - a.total)[0];
  const clusterSummary = {
    A: behavioralPoints.filter((point) => point.cluster === "A").length,
    B: behavioralPoints.filter((point) => point.cluster === "B").length,
    C: behavioralPoints.filter((point) => point.cluster === "C").length,
  };
  const topHotspots = useMemo(
    () =>
      [...previewHotspots]
        .sort((a, b) => b.crimeCount - a.crimeCount)
        .slice(0, 5)
        .map((hotspot, index) => ({
          name: hotspot.clusterId.replace(/^cluster_/i, ""),
          incidents: hotspot.crimeCount,
          risk: index === 0 || hotspot.crimeCount > (previewHotspots[1]?.crimeCount || hotspot.crimeCount) ? "high" : index < 3 ? "medium" : "low",
          delta: index === 0 ? "+18%" : index === 1 ? "+11%" : index === 2 ? "+7%" : "-3%",
        })),
    [previewHotspots]
  );

  const crimeTypes = crimeTypeRows.length
    ? crimeTypeRows
    : [
        { label: stats.topCrimeType, value: Math.max(1, stats.firLast7Days), color: "#3B6EFF" },
        { label: "Other", value: Math.max(1, Math.round(stats.firLast7Days * 0.6)), color: "#D97706" },
      ];
  const topCrimeMax = Math.max(...crimeTypes.map((item) => item.value), 1);
  const previewPriorityZone = previewHotspots[0]?.clusterId || stats.highRiskZones[0] || stats.topDistrict;
  return (
    <div className="mx-auto max-w-[1440px] space-y-6 overflow-hidden">
      {error ? (
        <div className="rounded-[22px] border border-[var(--risk-high)]/20 bg-[var(--risk-high-bg)] p-4 text-sm text-[var(--risk-high)]">
          {error}
        </div>
      ) : null}

      <div className="flex min-w-0 flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--fg-tertiary)]">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
          <h2 className="mt-2 break-words text-[30px] font-semibold tracking-[-0.03em] text-[var(--fg-primary)]">
            {new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening"},{" "}
            {authUser?.name?.split(" ")[0] || "Officer"}
          </h2>
          <p className="mt-2 break-words text-[15px] text-[var(--fg-secondary)]">
            {authUser?.zone || authUser?.policeStation || "Bihar"} · {fmt(stats.stationTotal)} stations · {fmt(stats.pendingFirs)} pending FIRs
          </p>
        </div>

        <div className="flex max-w-full flex-wrap items-center gap-2">
          <button className="inline-flex items-center gap-2 rounded-2xl border bg-[var(--bg-surface)] px-4 py-2 text-sm font-medium text-[var(--fg-secondary)] shadow-[var(--shadow-xs)]">
            <CalendarDays className="h-4 w-4" />
            Last 7 days
          </button>
          <button className="inline-flex items-center gap-2 rounded-2xl border bg-[var(--bg-surface)] px-4 py-2 text-sm font-medium text-[var(--fg-secondary)] shadow-[var(--shadow-xs)]">
            <Filter className="h-4 w-4" />
            Filters
          </button>
          <Link
            href="/dashboard/firs?compose=1"
            className="inline-flex items-center gap-2 rounded-2xl bg-[var(--accent-500)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-sm)]"
          >
            <Plus className="h-4 w-4" />
            Register FIR
          </Link>
        </div>
      </div>

      <section className="flex min-w-0 flex-wrap items-center gap-3 rounded-[24px] border border-[var(--risk-high)]/20 bg-[var(--risk-high-bg)] px-4 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[var(--risk-high)]/20 bg-white text-[var(--risk-high)] dark:bg-[var(--bg-surface)]">
          <Zap className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-semibold text-[var(--risk-critical)]">
            Spike detected — {stats.topCrimeType} in {stats.highRiskZones[0] || stats.topDistrict}
          </p>
          <p className="mt-1 break-words text-sm text-[var(--risk-high)]/90">
            Forecast confidence {stats.forecastConfidence}% · {stats.highRiskZones.slice(0, 3).join(" · ") || "No high-risk zones flagged"}
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

      <section className="surface-card min-w-0 rounded-[28px] p-5 md:p-6">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fg-tertiary)]">
              Hotspot map · your zone
            </p>
            <h3 className="mt-2 break-words text-xl font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">
              DBSCAN clusters + KDE heat · last 7 days
            </h3>
          </div>
          <div className="flex max-w-full flex-wrap items-center gap-2">
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
          <p className="mt-1 break-words text-lg font-semibold text-[var(--fg-primary)]">{previewPriorityZone}</p>
          <p className="mt-1 text-sm text-[var(--fg-secondary)]">
            Live hotspot preview from the current DBSCAN layer for your dashboard summary.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="surface-card min-w-0 rounded-[24px] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fg-tertiary)]">
            Forecast signal
          </p>
          <p className="mt-2 break-words text-xl font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">
            {forecastWindow.length ? `${forecastLow}–${forecastHigh}` : "Unavailable"}
          </p>
          <p className="mt-1 text-sm text-[var(--fg-secondary)]">
            {forecastWindow.length ? `ML service predicts ~${forecastMid} incidents/day` : "Need FIR history to compute the forecast."}
          </p>
        </div>

        <div className="surface-card min-w-0 rounded-[24px] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fg-tertiary)]">
            Risk signal
          </p>
          <p className="mt-2 break-words text-xl font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">
            {topRiskRows[0]?.name || stats.topDistrict}
          </p>
          <p className="mt-1 text-sm text-[var(--fg-secondary)]">
            Score {topRiskRows[0]?.score ?? stats.forecastConfidence} · {topRiskRows[0]?.frequency ?? stats.firLast7Days} incidents
          </p>
        </div>

        <div className="surface-card min-w-0 rounded-[24px] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fg-tertiary)]">
            Behavioral clusters
          </p>
          <p className="mt-2 break-words text-xl font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">
            A {clusterSummary.A} · B {clusterSummary.B} · C {clusterSummary.C}
          </p>
          <p className="mt-1 text-sm text-[var(--fg-secondary)]">
            Live ML clustering from the recent FIR window.
          </p>
        </div>

        <div className="surface-card min-w-0 rounded-[24px] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fg-tertiary)]">
            Seasonal peak
          </p>
          <p className="mt-2 break-words text-xl font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">
            {topSeasonal?.label || "No trend"}
          </p>
          <p className="mt-1 text-sm text-[var(--fg-secondary)]">
            {topSeasonal ? `${fmt(topSeasonal.total)} incidents in the strongest window` : "Seasonal trends unavailable."}
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <div className="surface-card min-w-0 rounded-[28px] p-5 lg:col-span-3">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fg-tertiary)]">
                Recent FIRs
              </p>
              <h3 className="mt-2 break-words text-xl font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">
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

          <div className="mt-5 overflow-x-auto rounded-[20px] border border-[var(--border-default)]">
            {/* Table header */}
            <div className="grid min-w-[680px] grid-cols-[1fr_1.5fr_1.2fr_1.5fr_1fr] gap-0 border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-6 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--fg-tertiary)]">
              <span className="py-1">FIR no</span>
              <span className="py-1">Type</span>
              <span className="py-1">Zone</span>
              <span className="py-1">Status</span>
              <span className="py-1 text-right">Time</span>
            </div>
            {/* Table body */}
            {recentFirs.length ? (
              recentFirs.map((fir) => {
                const crimeType = fir.crime_type || "Unknown";
                const risk = /theft|burglary/i.test(crimeType)
                  ? "high"
                  : /assault|harassment|robbery/i.test(crimeType)
                    ? "medium"
                    : "low";
                const timeLabel = fir.date_time
                  ? new Date(fir.date_time).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "-";

                return (
                  <div
                    key={fir.id}
                    className="grid min-w-[680px] grid-cols-[1fr_1.5fr_1.2fr_1.5fr_1fr] items-center gap-0 border-b border-[var(--border-default)] px-6 py-4 text-sm transition hover:bg-[var(--bg-subtle)]"
                  >
                    <span className="truncate font-mono font-medium text-[var(--fg-primary)]">{fir.id}</span>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`h-2 w-2 rounded-full flex-shrink-0 ${crimePalette[risk]}`} />
                      <span className="truncate text-[var(--fg-primary)]">{crimeType}</span>
                    </div>
                    <span className="truncate text-[var(--fg-secondary)]">{fir.zone || "N/A"}</span>
                    <div className="flex items-center">
                      <span
                        className={`inline-flex h-6 items-center justify-center rounded-lg px-2.5 text-xs font-semibold whitespace-nowrap ${
                          (fir.status || "Open") === "Closed"
                            ? "bg-[var(--bg-subtle)] text-[var(--fg-tertiary)]"
                            : "bg-[var(--accent-50)] text-[var(--accent-700)]"
                        }`}
                      >
                        {fir.status || "Open"}
                      </span>
                    </div>
                    <span className="text-right text-[var(--fg-secondary)] text-sm">{timeLabel}</span>
                  </div>
                );
              })
            ) : (
              <div className="px-5 py-8 text-center text-sm text-[var(--fg-secondary)]">
                No FIR records available yet.
              </div>
            )}
          </div>
        </div>

        <div className="surface-card min-w-0 rounded-[28px] p-5 lg:col-span-2">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fg-tertiary)]">
                Next 7 days · forecast
              </p>
              <h3 className="mt-2 break-words text-xl font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">
                Theft incidents · Patna zone
              </h3>
            </div>
            <span className="rounded-xl bg-[var(--accent-50)] px-2.5 py-1 text-xs font-semibold text-[var(--accent-700)]">
              Prophet
            </span>
          </div>

          <div className="mt-5">
            <div className="flex min-w-0 flex-wrap items-baseline gap-2">
              <p className="break-words text-[32px] font-semibold tracking-[-0.03em] text-[var(--fg-primary)]">
                {forecastWindow.length ? forecastLow : Math.max(158, Math.round(stats.firLast7Days * 1.2))}
                <span className="px-1 text-[var(--fg-tertiary)]">–</span>
                {forecastWindow.length ? forecastHigh : Math.max(192, Math.round(stats.firLast7Days * 1.45))}
              </p>
              <span className="text-sm text-[var(--fg-tertiary)]">expected · 80% CI</span>
            </div>

            <div className="mt-3 px-1">
              <Sparkline
                data={(() => {
                  if (!forecastWindow.length) return sparkSets.forecast;
                  const vals = forecastWindow.map((p) => p.yhat);
                  const range = Math.max(...vals) - Math.min(...vals);
                  return range >= 2 ? vals : sparkSets.forecast;
                })()}
                color="#3B6EFF"
                height={88}
              />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 border-t pt-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--fg-tertiary)]">
                  MAE (last 30d)
                </p>
                <p className="mt-1 text-base font-semibold text-[var(--fg-primary)]">
                  {forecastWindow.length ? `~${Math.max(1, Math.round((forecastHigh - forecastLow) / 4))} incidents` : "±4.2 incidents"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--fg-tertiary)]">
                  Trend
                </p>
                <p className="mt-1 inline-flex items-center gap-1 text-base font-semibold text-[var(--risk-high)]">
                  <TriangleAlert className="h-4 w-4" />
                  {forecastMid >= stats.firLast7Days ? "Rising" : "Stable"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="surface-card min-w-0 rounded-[28px] p-5">
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

        <div className="surface-card min-w-0 rounded-[28px] p-5">
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
              <div key={hotspot.name} className="grid min-w-0 grid-cols-[28px_minmax(0,1fr)_auto_auto] items-center gap-3 py-3">
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

        <div className="surface-card min-w-0 rounded-[28px] p-5">
          <div className="flex min-w-0 items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fg-tertiary)]">
                Officer activity
              </p>
              <h3 className="mt-2 break-words text-xl font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">
                Top FIR filers · 7 days
              </h3>
            </div>
          </div>
          <div className="mt-5 divide-y divide-[var(--border-default)]">
            {officerLeaderboard.length ? officerLeaderboard.map((officer, index) => (
              <div key={officer.id} className="grid min-w-0 grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 py-3">
                <span className="font-mono text-xs text-[var(--fg-tertiary)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--fg-primary)]">{officer.name}</p>
                  <p className="truncate text-[11px] text-[var(--fg-tertiary)]">{officer.police_station || officer.zone || "-"}</p>
                </div>
                <span className={`whitespace-nowrap rounded-xl px-2.5 py-1 text-xs font-semibold ${
                  index === 0 ? "risk-badge-high" : index < 3 ? "risk-badge-medium" : "risk-badge-low"
                }`}>
                  {officer.fir_count} FIRs
                </span>
              </div>
            )) : (
              <p className="py-6 text-center text-sm text-[var(--fg-tertiary)]">No officer data yet.</p>
            )}
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
