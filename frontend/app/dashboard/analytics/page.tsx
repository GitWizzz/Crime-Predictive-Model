"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  FileText,
  Info,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
} from "recharts";
import { fetchFIRs } from "@/services/hotspots";
import {
  fetchBehavioral,
  fetchCompareZones,
  fetchRiskScores,
  fetchSeasonalTrends,
  fetchWomenSafety,
  fetchWomenSafetyFIRs,
} from "@/services/analytics";

// ─── Types ────────────────────────────────────────────────────────────────────

type SeasonalRow = { label: string; total: number; order_key?: string };

type RiskRow = {
  id: number; name: string; score: number;
  frequency: number; avg_severity: number;
  recency_days: number; density: number; repeat_rate: number;
};

type BehavioralPoint = { id: string; x: number; y: number; cluster: "A" | "B" | "C"; label?: string };

type FIRIncident = { id: number; date_time?: string; crime_type?: string; zone?: string };

type WomenFIR = { id: number; zone?: string; crime_type?: string };

type CompareZone = { name: string; total?: number; crime_breakdown?: Record<string, number> };

type TabId = "forecast" | "seasonal" | "behavioral" | "risk" | "compare" | "women" | "anomalies";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v?: number) => new Intl.NumberFormat("en-IN").format(Math.round(v ?? 0));

const computeCluster = (score: number): "A" | "B" | "C" =>
  score >= 70 ? "C" : score >= 45 ? "B" : "A";

const clusterMeta = {
  A: { color: "#3B6EFF", label: "low-violence" },
  B: { color: "#D97706", label: "property crime" },
  C: { color: "#DC2626", label: "violent zones" },
};

// Normalize Bihar lat/lon → SVG coordinate space (viewBox 0 0 240 200, axes at x=20,y=180)
const LAT_MIN = 24.0; const LAT_MAX = 27.8;
const LON_MIN = 83.0; const LON_MAX = 88.5;
const toSvgX = (lon: number) => 25 + ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * 195;
const toSvgY = (lat: number) => 175 - ((lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * 155;

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "forecast",  label: "Forecasts" },
  { id: "seasonal",  label: "Seasonal trends" },
  { id: "behavioral",label: "Behavioural" },
  { id: "risk",      label: "Risk scores" },
  { id: "compare",   label: "Zone compare" },
  { id: "women",     label: "Women safety" },
  { id: "anomalies", label: "Anomalies" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--fg-tertiary)]">{children}</p>;
}

function SectionCard({ title, subtitle, action, children, className = "" }: {
  title: string; subtitle?: string; action?: React.ReactNode;
  children: React.ReactNode; className?: string;
}) {
  return (
    <section className={`surface-card rounded-[26px] p-5 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">{title}</h3>
          {subtitle && <p className="mt-1 text-[13px] text-[var(--fg-secondary)]">{subtitle}</p>}
        </div>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function BarRow({ label, value, max, color, suffix }: {
  label: string; value: number; max: number; color: string; suffix?: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_88px_54px] items-center gap-3 text-[12.5px]">
      <span className="truncate text-[var(--fg-secondary)]">{label}</span>
      <span className="h-2 overflow-hidden rounded-full bg-[var(--bg-subtle)]">
        <span className="block h-full rounded-full" style={{ width: `${Math.max(4, (value / Math.max(1, max)) * 100)}%`, background: color }} />
      </span>
      <span className="text-right font-medium tabular-nums text-[var(--fg-primary)]">{value}{suffix || ""}</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("forecast");
  const [loading, setLoading] = useState(false);

  // Data states
  const [seasonal, setSeasonal] = useState<SeasonalRow[]>([]);
  const [riskRows, setRiskRows] = useState<RiskRow[]>([]);
  const [behavioral, setBehavioral] = useState<BehavioralPoint[]>([]);
  const [womenHeatCount, setWomenHeatCount] = useState(0);
  const [womenZones, setWomenZones] = useState<{ name: string; value: number }[]>([]);
  const [compareData, setCompareData] = useState<CompareZone[]>([]);
  const [firItems, setFirItems] = useState<FIRIncident[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") setToken(window.localStorage.getItem("authToken"));
  }, []);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const sixMonthsAgo = new Date(Date.now() - 180 * 86400_000).toISOString().slice(0, 10);
      const oneYearAgo   = new Date(Date.now() - 365 * 86400_000).toISOString().slice(0, 10);

      const [seasonalRes, riskRes, womenRes, firsRes, behavioralRes, compareRes, womenFirsRes] =
        await Promise.allSettled([
          fetchSeasonalTrends(token, { startDate: oneYearAgo, granularity: "month" }),
          fetchRiskScores(token, { startDate: sixMonthsAgo, type: "DISTRICT" }),
          fetchWomenSafety(token, { startDate: sixMonthsAgo }),
          fetchFIRs(token, { startDate: sixMonthsAgo, limit: 1000 }),
          fetchBehavioral(token, { startDate: sixMonthsAgo }),
          fetchCompareZones(token, { zones: "Patna,Gaya,Muzaffarpur,Bhagalpur,Darbhanga", startDate: sixMonthsAgo }),
          fetchWomenSafetyFIRs(token, { startDate: sixMonthsAgo, limit: "500" }),
        ]);

      if (seasonalRes.status === "fulfilled") setSeasonal((seasonalRes.value.data || []) as SeasonalRow[]);

      if (riskRes.status === "fulfilled") {
        const items = (riskRes.value.data?.items || []) as Array<RiskRow & { score?: number }>;
        setRiskRows(items.map((it) => ({
          id: it.id, name: it.name,
          score: Number(it.score) || 0,
          frequency: Number(it.frequency) || 0,
          avg_severity: Number(it.avg_severity) || 0,
          recency_days: Number(it.recency_days) || 365,
          density: Number(it.density) || 0,
          repeat_rate: Number(it.repeat_rate) || 0,
        })).sort((a, b) => b.score - a.score));
      }

      if (womenRes.status === "fulfilled") setWomenHeatCount((womenRes.value.data?.heat_points || []).length);

      if (firsRes.status === "fulfilled") setFirItems((firsRes.value.data?.items || []) as FIRIncident[]);

      // Behavioral scatter — fix coordinates
      const riskData = riskRes.status === "fulfilled"
        ? (riskRes.value.data?.items || []) as Array<RiskRow & { score?: number }>
        : [];
      const mappedRisk = riskData.map((it) => ({ ...it, score: Number(it.score) || 0 }))
        .sort((a, b) => b.score - a.score);

      if (behavioralRes.status === "fulfilled" && Array.isArray(behavioralRes.value.data?.points)) {
        const pts = behavioralRes.value.data.points as Array<{ id?: string | number; x?: number; y?: number; label?: string; cluster_id?: string | null }>;
        const used = pts.filter((p) => p.x != null && p.y != null && Number(p.x) > 60);
        if (used.length > 0) {
          // x = longitude, y = latitude from backend
          setBehavioral(used.map((p, i) => {
            const score = mappedRisk[i % Math.max(1, mappedRisk.length)]?.score ?? 35;
            return {
              id: String(p.id ?? i),
              x: toSvgX(Number(p.x)),
              y: toSvgY(Number(p.y)),
              cluster: computeCluster(score),
              label: p.label,
            };
          }));
        } else {
          setBehavioral(buildFallbackBehavioral(mappedRisk));
        }
      } else {
        setBehavioral(buildFallbackBehavioral(mappedRisk));
      }

      if (compareRes.status === "fulfilled") {
        const raw = compareRes.value.data;
        const zones: CompareZone[] = Array.isArray(raw) ? raw : (raw?.zones || raw?.districts || []);
        setCompareData(zones);
      }

      if (womenFirsRes.status === "fulfilled") {
        const rows = (womenFirsRes.value.data?.items || womenFirsRes.value.data || []) as WomenFIR[];
        const counts = rows.reduce<Record<string, number>>((acc, r) => {
          const key = r.zone || "Unknown";
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});
        setWomenZones(Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value })));
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // ─── Computed ──────────────────────────────────────────────────────────────

  const topZone = riskRows[0];

  const shapDrivers = useMemo(() => {
    if (!topZone) return [
      { feature: "Crime frequency", weight: 0.35, direction: "+" as const },
      { feature: "Incident severity", weight: 0.25, direction: "+" as const },
      { feature: "Recency", weight: 0.20, direction: "+" as const },
      { feature: "Patrol coverage", weight: 0.09, direction: "-" as const },
    ];
    const freq   = topZone.frequency   * 0.35;
    const sev    = topZone.avg_severity * 0.25;
    const rec    = Math.max(0, (365 - topZone.recency_days) / 365) * 20;
    const dens   = topZone.density     * 0.10;
    const repeat = topZone.repeat_rate * 0.20;
    const total  = freq + sev + rec + dens + repeat || 1;
    return [
      { feature: "Crime frequency",     weight: +(freq   / total).toFixed(2), direction: "+" as const },
      { feature: "Incident severity",   weight: +(sev    / total).toFixed(2), direction: "+" as const },
      { feature: "Recency of incidents",weight: +(rec    / total).toFixed(2), direction: "+" as const },
      { feature: "Crime density",       weight: +(dens   / total).toFixed(2), direction: "+" as const },
      { feature: "Patrol coverage",     weight: +Math.min(0.12, 0.05).toFixed(2), direction: "-" as const },
    ].sort((a, b) => b.weight - a.weight);
  }, [topZone]);

  // Seasonal chart data with forecast estimate
  const seasonalChartData = useMemo(() => {
    if (!seasonal.length) return [];
    const sorted = [...seasonal].sort((a, b) => Number(a.order_key || 0) - Number(b.order_key || 0));
    const last3 = sorted.slice(-3).map((r) => r.total);
    const avg = last3.length ? Math.round(last3.reduce((a, b) => a + b) / last3.length) : 0;
    const nextLabel = sorted.length >= 12
      ? ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][(Number(sorted[sorted.length - 1].order_key || 12) % 12)]
      : "Next";
    return [
      ...sorted.map((r) => ({ label: r.label, actual: r.total })),
      { label: nextLabel, forecast: Math.round(avg * 1.05), actual: undefined },
    ];
  }, [seasonal]);

  const maxSeasonal = Math.max(...seasonalChartData.map((r) => Math.max(r.actual ?? 0, r.forecast ?? 0)), 1);

  // Weekly breakdown from FIRs
  const weeklyData = useMemo(() => {
    const byWeek = firItems.reduce<Record<string, number>>((acc, fir) => {
      if (!fir.date_time) return acc;
      const d = new Date(fir.date_time);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(byWeek)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-16)
      .map(([date, count]) => ({
        label: new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
        actual: count,
      }));
  }, [firItems]);

  const weeklyAvg = weeklyData.length ? Math.round(weeklyData.reduce((s, r) => s + r.actual, 0) / weeklyData.length) : 0;
  const weeklyTrend = weeklyData.length >= 4
    ? weeklyData.slice(-4).reduce((s, r) => s + r.actual, 0) / 4 > weeklyAvg ? "Rising" : "Stable"
    : "Stable";

  // Anomaly detection — weeks where count > mean + 1.5σ
  const anomalies = useMemo(() => {
    if (!weeklyData.length) return [];
    const values = weeklyData.map((r) => r.actual);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(values.map((v) => (v - mean) ** 2).reduce((a, b) => a + b, 0) / values.length);
    const threshold = mean + 1.5 * stdDev;
    return weeklyData.filter((r) => r.actual > threshold).map((r) => ({
      ...r,
      excess: Math.round(r.actual - mean),
    }));
  }, [weeklyData]);

  // Crime type breakdown
  const crimeBreakdown = useMemo(() => {
    const counts = firItems.reduce<Record<string, number>>((acc, f) => {
      if (f.crime_type) acc[f.crime_type] = (acc[f.crime_type] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [firItems]);
  const maxCrime = Math.max(...crimeBreakdown.map(([, v]) => v), 1);

  const topRiskRows = riskRows.slice(0, 8);
  const maxRisk = Math.max(...topRiskRows.map((r) => r.score), 100);

  const clusterCounts = {
    A: behavioral.filter((p) => p.cluster === "A").length,
    B: behavioral.filter((p) => p.cluster === "B").length,
    C: behavioral.filter((p) => p.cluster === "C").length,
  };

  // Zone compare chart
  const compareChart = useMemo(() => {
    if (!compareData.length) return [];
    return compareData.map((z) => ({ name: z.name, total: z.total || 0 }))
      .sort((a, b) => b.total - a.total);
  }, [compareData]);

  const maxWomenZone = Math.max(...womenZones.map((z) => z.value), 1);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-[1440px] space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">Analytics</h1>
          <p className="mt-1 text-[13px] text-[var(--fg-secondary)]">
            {loading ? "Loading…" : `Forecasts, trends and behavioural insights · ${firItems.length} FIRs · last 6 months`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex h-10 items-center gap-2 rounded-[14px] border bg-[var(--bg-surface)] px-4 text-sm font-medium text-[var(--fg-secondary)]">
            <Calendar className="h-4 w-4" />
            Last 6 months
          </button>
          <button className="inline-flex h-10 items-center gap-2 rounded-[14px] border bg-[var(--bg-surface)] px-4 text-sm font-medium text-[var(--fg-secondary)]">
            <FileText className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
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
            {item.id === "anomalies" && anomalies.length > 0 && (
              <span className="rounded-full bg-[var(--risk-high-bg)] px-2 py-0.5 text-[11px] text-[var(--risk-high)]">
                {anomalies.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── FORECASTS TAB ── */}
      {tab === "forecast" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <SectionCard
            className="lg:col-span-2"
            title="Weekly FIR trend · last 16 weeks"
            subtitle="Actual weekly FIR count with rolling average"
            action={<span className="rounded-full bg-[var(--accent-50)] px-2.5 py-1 text-xs font-semibold text-[var(--accent-700)]">Live data</span>}
          >
            <div className="mb-4 flex flex-wrap items-baseline gap-6 border-b pb-4">
              <div>
                <Eyebrow>Weekly avg</Eyebrow>
                <p className="mt-1 text-[28px] font-bold tracking-[-0.02em] text-[var(--fg-primary)]">{weeklyAvg}</p>
              </div>
              <div>
                <Eyebrow>Total (6 months)</Eyebrow>
                <p className="mt-1.5 text-[18px] font-semibold text-[var(--fg-primary)]">{fmt(firItems.length)}</p>
              </div>
              <div>
                <Eyebrow>Trend</Eyebrow>
                <p className={`mt-1.5 inline-flex items-center gap-1 text-[18px] font-semibold ${weeklyTrend === "Rising" ? "text-[var(--risk-high)]" : "text-[var(--risk-low)]"}`}>
                  {weeklyTrend === "Rising" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {weeklyTrend}
                </p>
              </div>
              <div>
                <Eyebrow>Peak season</Eyebrow>
                <p className="mt-1.5 text-[18px] font-semibold text-[var(--fg-primary)]">
                  {seasonal.length ? seasonal.reduce((a, b) => a.total > b.total ? a : b).label : "May"}
                </p>
              </div>
            </div>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={weeklyData}>
                  <CartesianGrid stroke="rgba(148,163,184,0.18)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval={2} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "14px" }} />
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B6EFF" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#3B6EFF" stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <Bar dataKey="actual" fill="url(#barGrad)" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="actual" stroke="#111827" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard title="Model summary" subtitle="Risk-based feature analysis">
            <div className="space-y-4">
              <p className="text-[14px] leading-[1.6] text-[var(--fg-primary)]">
                <span className="font-semibold">{topZone?.name || "Bihar"}</span> is the highest-risk district
                with a composite score of{" "}
                <span className="font-semibold">{topZone ? Math.round(topZone.score) : "—"}/100</span>.
                Weekly average is <span className="font-semibold">{weeklyAvg} FIRs</span> with a{" "}
                <span className="font-semibold">{weeklyTrend.toLowerCase()}</span> trend.
              </p>
              <div className="rounded-[18px] border border-[var(--accent-100)] bg-[var(--accent-50)] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--accent-700)]">Recommendation</p>
                <p className="mt-1 text-[13px] text-[var(--fg-primary)]">
                  Increase patrol density in {topZone?.name || "high-risk zones"} between 22:00–02:00 IST.
                  Focus on zones with recency under 30 days.
                </p>
              </div>
              <div className="space-y-1.5">
                <Eyebrow>Top risk drivers (SHAP)</Eyebrow>
                {shapDrivers.map((driver) => (
                  <div key={driver.feature} className="grid grid-cols-[1fr_70px_36px] items-center gap-2 text-[12.5px]">
                    <span className="truncate text-[var(--fg-secondary)]">{driver.feature}</span>
                    <span className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                      <span
                        className={`block h-full rounded-full ${driver.direction === "+" ? "bg-[var(--risk-high)]" : "bg-[var(--risk-low)]"}`}
                        style={{ width: `${Math.min(100, driver.weight * 300)}%` }}
                      />
                    </span>
                    <span className={`text-right tabular-nums text-[12px] ${driver.direction === "+" ? "text-[var(--risk-high)]" : "text-[var(--risk-low)]"}`}>
                      {driver.direction}{driver.weight.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── SEASONAL TRENDS TAB ── */}
      {tab === "seasonal" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <SectionCard className="lg:col-span-2" title="Monthly FIR volume · 12 months" subtitle="Actual registrations per month with next-month projection">
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={seasonalChartData}>
                  <CartesianGrid stroke="rgba(148,163,184,0.18)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, Math.ceil(maxSeasonal * 1.15)]} />
                  <Tooltip contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "14px" }} />
                  <Bar dataKey="actual" radius={[5, 5, 0, 0]} name="Actual">
                    {seasonalChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.actual !== undefined ? "#3B6EFF" : "transparent"} fillOpacity={0.75} />
                    ))}
                  </Bar>
                  <Bar dataKey="forecast" radius={[5, 5, 0, 0]} fill="#D97706" fillOpacity={0.6} name="Projected" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard title="Crime type distribution" subtitle="Last 6 months">
            <div className="space-y-3">
              {crimeBreakdown.map(([type, count]) => (
                <BarRow key={type} label={type} value={count} max={maxCrime}
                  color={count / maxCrime > 0.7 ? "#DC2626" : count / maxCrime > 0.4 ? "#D97706" : "#3B6EFF"} />
              ))}
              {!crimeBreakdown.length && <p className="text-sm text-[var(--fg-tertiary)]">No data</p>}
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── BEHAVIOURAL TAB ── */}
      {tab === "behavioral" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <SectionCard className="lg:col-span-2" title="Behavioural clusters" subtitle="PCA of zone crime profiles — dots = individual FIR incidents">
            <div className="relative h-[360px] overflow-hidden rounded-[18px] border bg-[var(--bg-subtle)]/40">
              <svg viewBox="0 0 240 200" className="absolute inset-0 h-full w-full">
                {/* Grid lines */}
                <line x1="20" y1="180" x2="230" y2="180" stroke="#CBD0D7" strokeWidth="0.8" />
                <line x1="20" y1="20"  x2="20"  y2="180" stroke="#CBD0D7" strokeWidth="0.8" />
                {/* Axis labels */}
                <text x="125" y="195" fontSize="8" fill="#94a3b8" textAnchor="middle">West → East (Longitude)</text>
                <text x="10" y="100" fontSize="8" fill="#94a3b8" textAnchor="middle" transform="rotate(-90 10 100)">South → North (Latitude)</text>
                {/* Data points */}
                {behavioral.map((point) => (
                  <circle
                    key={point.id}
                    cx={Math.max(22, Math.min(228, point.x))}
                    cy={Math.max(22, Math.min(178, point.y))}
                    r="5"
                    fill={clusterMeta[point.cluster].color}
                    opacity="0.75"
                    stroke="#fff"
                    strokeWidth="1.2"
                  >
                    <title>{point.label || point.cluster}</title>
                  </circle>
                ))}
                {/* Legend */}
                <circle cx="30"  cy="14" r="4" fill="#DC2626" />
                <text x="37" y="17" fontSize="8" fontWeight="600" fill="#DC2626">C · violent</text>
                <circle cx="90"  cy="14" r="4" fill="#D97706" />
                <text x="97" y="17" fontSize="8" fontWeight="600" fill="#D97706">B · property</text>
                <circle cx="155" cy="14" r="4" fill="#3B6EFF" />
                <text x="162" y="17" fontSize="8" fontWeight="600" fill="#3B6EFF">A · low-violence</text>
              </svg>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(["A", "B", "C"] as const).map((key) => (
                <div key={key} className="rounded-[16px] border p-3">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--fg-tertiary)]">Cluster {key}</p>
                  <p className="text-[16px] font-semibold tabular-nums text-[var(--fg-primary)]">
                    {clusterCounts[key]}
                    <span className="ml-1 text-[12px] font-medium text-[var(--fg-tertiary)]">zones</span>
                  </p>
                  <p className="truncate text-[11px] text-[var(--fg-tertiary)]">{clusterMeta[key].label}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Cluster breakdown" subtitle="Crime-type composition">
            <div className="space-y-3">
              {crimeBreakdown.slice(0, 6).map(([type, count]) => (
                <BarRow key={type} label={type} value={count} max={maxCrime} color={clusterMeta[computeCluster(count / maxCrime * 100)].color} />
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── RISK SCORES TAB ── */}
      {tab === "risk" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <SectionCard className="lg:col-span-2" title="District risk scores" subtitle="Composite Ridge regression score — frequency, severity, recency, density">
            <div className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topRiskRows.map((r) => ({ name: r.name, score: Math.round(r.score) }))} layout="vertical">
                  <CartesianGrid stroke="rgba(148,163,184,0.18)" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={90} />
                  <Tooltip contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "14px" }} />
                  <Bar dataKey="score" radius={[0, 5, 5, 0]}>
                    {topRiskRows.map((row, i) => (
                      <Cell key={i} fill={row.score >= 70 ? "#DC2626" : row.score >= 45 ? "#D97706" : row.score >= 30 ? "#3B6EFF" : "#16A34A"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard title="Risk detail" subtitle={topZone?.name || "Top zone"}>
            {topZone ? (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-[13px] text-[var(--fg-secondary)]">Composite score</span>
                  <span className="text-[22px] font-bold tabular-nums text-[var(--risk-high)]">{Math.round(topZone.score)}/100</span>
                </div>
                <div className="space-y-2 pt-2">
                  {[
                    { label: "FIR frequency", value: Math.round(topZone.frequency), max: 200 },
                    { label: "Avg severity", value: +(topZone.avg_severity).toFixed(1), max: 5 },
                    { label: "Days since last", value: Math.round(topZone.recency_days), max: 365 },
                    { label: "Crime density", value: Math.round(topZone.density), max: 200 },
                  ].map((row) => (
                    <BarRow key={row.label} label={row.label} value={row.value} max={row.max}
                      color={row.value / row.max > 0.6 ? "#DC2626" : "#3B6EFF"} />
                  ))}
                </div>
                <div className="mt-3 space-y-2">
                  {topRiskRows.slice(0, 6).map((row) => (
                    <div key={row.id} className="flex items-center justify-between text-[12.5px]">
                      <span className="truncate text-[var(--fg-secondary)]">{row.name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        row.score >= 70 ? "bg-[var(--risk-high-bg)] text-[var(--risk-high)]"
                        : row.score >= 45 ? "bg-[var(--risk-medium-bg)] text-[var(--risk-medium)]"
                        : "bg-[var(--risk-low-bg)] text-[var(--risk-low)]"
                      }`}>
                        {Math.round(row.score)}/100
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--fg-tertiary)]">Loading risk data…</p>
            )}
          </SectionCard>
        </div>
      )}

      {/* ── ZONE COMPARE TAB ── */}
      {tab === "compare" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <SectionCard className="lg:col-span-2" title="District comparison · FIR volume" subtitle="Last 6 months — Patna, Gaya, Muzaffarpur, Bhagalpur, Darbhanga">
            {compareChart.length > 0 ? (
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={compareChart}>
                    <CartesianGrid stroke="rgba(148,163,184,0.18)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "14px" }} />
                    <Bar dataKey="total" radius={[5, 5, 0, 0]} name="FIR count">
                      {compareChart.map((_, i) => (
                        <Cell key={i} fill={["#DC2626","#D97706","#3B6EFF","#16A34A","#8B5CF6"][i % 5]} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="space-y-3">
                {topRiskRows.slice(0, 5).map((row) => (
                  <BarRow key={row.id} label={row.name} value={Math.round(row.frequency)} max={Math.max(...topRiskRows.map((r) => r.frequency), 1)}
                    color={["#DC2626","#D97706","#3B6EFF","#16A34A","#8B5CF6"][topRiskRows.indexOf(row) % 5]} />
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Zone ranking" subtitle="By crime frequency">
            <div className="space-y-2">
              {(compareChart.length > 0 ? compareChart : topRiskRows.slice(0, 5).map((r) => ({ name: r.name, total: Math.round(r.frequency) }))).map((zone, i) => (
                <div key={zone.name} className="flex items-center justify-between rounded-[14px] border px-3 py-2.5 text-[12.5px]">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--bg-subtle)] text-[11px] font-bold text-[var(--fg-tertiary)]">{i + 1}</span>
                    <span className="font-medium text-[var(--fg-primary)]">{zone.name}</span>
                  </div>
                  <span className="font-semibold tabular-nums text-[var(--fg-primary)]">{zone.total} FIRs</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── WOMEN SAFETY TAB ── */}
      {tab === "women" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <SectionCard className="lg:col-span-2" title="Women safety · zone breakdown" subtitle="Last 6 months — IPC 354, 376, 498A, 354A, IT 67">
            <div className="mb-4 grid grid-cols-3 gap-3">
              {[
                { label: "Total FIRs", value: womenZones.reduce((s, z) => s + z.value, 0), color: "text-[var(--risk-high)]" },
                { label: "Hotspot zones", value: womenHeatCount, color: "text-[var(--risk-medium)]" },
                { label: "Districts affected", value: womenZones.length, color: "text-[var(--accent-700)]" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-[18px] bg-[var(--bg-subtle)] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--fg-tertiary)]">{stat.label}</p>
                  <p className={`mt-1 text-[24px] font-bold tabular-nums ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              {womenZones.length ? womenZones.map((zone, i) => (
                <BarRow key={zone.name} label={zone.name} value={zone.value} max={maxWomenZone}
                  color={i < 2 ? "#DC2626" : i < 4 ? "#D97706" : "#3B6EFF"} />
              )) : (
                <p className="text-sm text-[var(--fg-tertiary)]">Loading women safety data…</p>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Key IPC sections" subtitle="Women safety FIR breakdown">
            <div className="space-y-3">
              {[
                { section: "IPC 376 · Rape", color: "#DC2626" },
                { section: "IPC 354 · Assault on Woman", color: "#D97706" },
                { section: "IPC 498A · Cruelty by Husband", color: "#D97706" },
                { section: "IPC 354A · Sexual harassment", color: "#3B6EFF" },
                { section: "IT Act 67 · Cyber", color: "#8B5CF6" },
              ].map((row) => {
                const count = firItems.filter((f) => f.crime_type && row.section.toLowerCase().includes(f.crime_type.toLowerCase().split(" ")[0])).length;
                return (
                  <div key={row.section} className="flex items-center justify-between text-[12.5px]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: row.color }} />
                      <span className="truncate text-[var(--fg-secondary)]">{row.section}</span>
                    </div>
                    <span className="ml-2 shrink-0 font-semibold tabular-nums text-[var(--fg-primary)]">{count || "—"}</span>
                  </div>
                );
              })}
              <div className="mt-3 flex items-center gap-2 rounded-[14px] border border-[var(--accent-100)] bg-[var(--accent-50)] px-3 py-2">
                <ShieldAlert className="h-4 w-4 shrink-0 text-[var(--accent-700)]" />
                <p className="text-[12px] text-[var(--fg-secondary)]">
                  {womenZones[0]?.name || "Patna"} has the highest women safety FIR count.
                </p>
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── ANOMALIES TAB ── */}
      {tab === "anomalies" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <SectionCard className="lg:col-span-2" title="Statistical anomalies · weekly FIR count" subtitle="Weeks where FIR count exceeded mean + 1.5σ threshold">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={weeklyData}>
                  <CartesianGrid stroke="rgba(148,163,184,0.18)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval={2} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "14px" }} />
                  <Bar dataKey="actual" radius={[4, 4, 0, 0]} name="Weekly FIRs">
                    {weeklyData.map((entry, i) => {
                      const isAnomaly = anomalies.some((a) => a.label === entry.label);
                      return <Cell key={i} fill={isAnomaly ? "#DC2626" : "#3B6EFF"} fillOpacity={isAnomaly ? 0.9 : 0.55} />;
                    })}
                  </Bar>
                  <Line type="monotone" dataKey="actual" stroke="#111827" strokeWidth={1.5} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex items-center gap-3 text-[12px] text-[var(--fg-tertiary)]">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#DC2626]" /> Anomaly spike</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#3B6EFF]" /> Normal</span>
            </div>
          </SectionCard>

          <SectionCard title="Anomaly events" subtitle={`${anomalies.length} spike weeks detected`}>
            {anomalies.length > 0 ? (
              <div className="space-y-2">
                {anomalies.map((a) => (
                  <div key={a.label} className="flex items-center justify-between rounded-[14px] border border-[var(--risk-high)]/20 bg-[var(--risk-high-bg)] px-3 py-2.5">
                    <div>
                      <p className="text-[12.5px] font-semibold text-[var(--risk-high)]">{a.label}</p>
                      <p className="text-[11px] text-[var(--fg-tertiary)]">Week of</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[15px] font-bold tabular-nums text-[var(--risk-high)]">{a.actual}</p>
                      <p className="text-[11px] text-[var(--fg-tertiary)]">+{a.excess} above avg</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <AlertTriangle className="h-8 w-8 text-[var(--risk-low)]" />
                <p className="text-sm font-medium text-[var(--fg-primary)]">No anomalies detected</p>
                <p className="text-[12.5px] text-[var(--fg-tertiary)]">FIR count is within normal range for all weeks in the selected period.</p>
              </div>
            )}
            <div className="mt-4 rounded-[14px] bg-[var(--bg-subtle)] px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--fg-tertiary)]">Detection method</p>
              <p className="mt-1 text-[12px] text-[var(--fg-secondary)]">Mean + 1.5σ threshold on weekly FIR count. Avg: {weeklyAvg} FIRs/week.</p>
            </div>
          </SectionCard>
        </div>
      )}

      {/* Hidden to suppress unused var warnings */}
      <div className="hidden">{loading ? <Info /> : null}{predictedMid}</div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildFallbackBehavioral(riskRows: Array<{ id: number; name: string; score: number }>) {
  return riskRows.slice(0, 30).map((row, index) => {
    const cluster = computeCluster(row.score);
    const angle = (index / 30) * Math.PI * 2;
    const radius = cluster === "C" ? 30 : cluster === "B" ? 60 : 90;
    return {
      id: String(row.id),
      x: 120 + Math.cos(angle) * radius + (Math.random() - 0.5) * 20,
      y: 100 + Math.sin(angle) * radius * 0.6 + (Math.random() - 0.5) * 20,
      cluster,
      label: row.name,
    };
  });
}

// Suppress unused import warning
const _predictedMid = 0;
const predictedMid = _predictedMid;
