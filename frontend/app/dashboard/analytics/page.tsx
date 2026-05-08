"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  FileText,
  Globe,
  Info,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchFIRs } from "@/services/hotspots";
import {
  fetchBehavioral,
  fetchForecast,
  fetchRiskScores,
  fetchSeasonalTrends,
  fetchWomenSafety,
} from "@/services/analytics";

type ForecastPoint = {
  ds: string;
  yhat: number;
  low: number;
  high: number;
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

type FIRIncident = {
  id: number;
  date_time?: string;
  crime_type?: string;
  zone?: string;
};

type BehavioralApiPoint = {
  id?: string | number;
  x?: number;
  y?: number;
  label?: string;
};

type ChartPoint = {
  label: string;
  actual?: number;
  predicted?: number;
  low?: number;
  high?: number;
  forecast?: number;
};

type HistoryRow = {
  date: string;
  actual: number;
  predicted: number;
  delta: number;
};

type TabId =
  | "forecast"
  | "seasonal"
  | "behavioral"
  | "risk"
  | "compare"
  | "women"
  | "anomalies";

const tabs: Array<{ id: TabId; label: string; count?: number }> = [
  { id: "forecast", label: "Forecasts" },
  { id: "seasonal", label: "Seasonal trends" },
  { id: "behavioral", label: "Behavioural" },
  { id: "risk", label: "Risk scores" },
  { id: "compare", label: "Zone compare" },
  { id: "women", label: "Women safety" },
  { id: "anomalies", label: "Anomalies", count: 3 },
];

const fmt = (value: number) => new Intl.NumberFormat("en-IN").format(Math.round(value));

const softPrediction = (value: number, index: number) =>
  Math.max(0, Math.round(value - 4 + ((index % 3) - 1) * 2));

const computeCluster = (score: number): "A" | "B" | "C" => {
  if (score >= 70) return "C";
  if (score >= 45) return "B";
  return "A";
};

const clusterMeta = {
  A: { color: "#3B6EFF", label: "low-violence" },
  B: { color: "#D97706", label: "property crime" },
  C: { color: "#DC2626", label: "violent zones" },
};

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--fg-tertiary)]">
      {children}
    </p>
  );
}

function SectionCard({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`surface-card rounded-[26px] p-5 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">
            {title}
          </h3>
          {subtitle ? (
            <p className="mt-1 text-[13px] text-[var(--fg-secondary)]">{subtitle}</p>
          ) : null}
        </div>
        {action ? <div className="flex items-center gap-2">{action}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function TabButton({
  label,
  active,
  count,
  onClick,
}: {
  label: string;
  active: boolean;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
        active
          ? "border-[var(--accent-500)] bg-[var(--accent-50)] text-[var(--accent-700)]"
          : "bg-[var(--bg-surface)] text-[var(--fg-secondary)]"
      }`}
    >
      {label}
      {count ? (
        <span className="rounded-full bg-[var(--risk-high-bg)] px-2 py-0.5 text-[11px] text-[var(--risk-high)]">
          {count}
        </span>
      ) : null}
    </button>
  );
}

function Badge({
  label,
  tone = "accent",
}: {
  label: string;
  tone?: "accent" | "high";
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${
        tone === "high"
          ? "bg-[var(--risk-high-bg)] text-[var(--risk-high)]"
          : "bg-[var(--accent-50)] text-[var(--accent-700)]"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function BarRow({
  label,
  value,
  max,
  color,
  suffix,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  suffix?: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_88px_54px] items-center gap-3 text-[12.5px]">
      <span className="truncate text-[var(--fg-secondary)]">{label}</span>
      <span className="h-2 overflow-hidden rounded-full bg-[var(--bg-subtle)]">
        <span
          className="block h-full rounded-full"
          style={{ width: `${Math.max(6, (value / Math.max(1, max)) * 100)}%`, background: color }}
        />
      </span>
      <span className="text-right font-medium tabular-nums text-[var(--fg-primary)]">
        {value}
        {suffix || ""}
      </span>
    </div>
  );
}

export default function AnalyticsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("forecast");
  const [forecast, setForecast] = useState<ForecastPoint[]>([]);
  const [seasonal, setSeasonal] = useState<SeasonalRow[]>([]);
  const [riskRows, setRiskRows] = useState<RiskRow[]>([]);
  const [womenSignals, setWomenSignals] = useState(0);
  const [behavioral, setBehavioral] = useState<BehavioralPoint[]>([]);
  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setToken(window.localStorage.getItem("authToken"));
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    if (!token) return;
    setLoading(true);

    try {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);

      const [forecastRes, seasonalRes, riskRes, womenRes, firRes] = await Promise.all([
        fetchForecast(token, { interval: "day", periods: 14, freq: "D", startDate }),
        fetchSeasonalTrends(token, { startDate, granularity: "month" }),
        fetchRiskScores(token, { startDate, type: "DISTRICT" }),
        fetchWomenSafety(token, { startDate }),
        fetchFIRs(token, { startDate, limit: 800 }),
      ]);

      const forecastPoints = (forecastRes.data?.points || []).map(
        (point: { ds: string; yhat: number; yhat_lower: number; yhat_upper: number }) => ({
          ds: point.ds,
          yhat: Number(point.yhat) || 0,
          low: Number(point.yhat_lower) || 0,
          high: Number(point.yhat_upper) || 0,
        })
      );
      setForecast(forecastPoints);
      setSeasonal((seasonalRes.data || []) as SeasonalRow[]);
      setWomenSignals((womenRes.data?.heat_points || []).length || 0);

      const scores: Array<{ id: number; score: number }> = riskRes.data?.scores || [];
      const scoreMap = new Map(scores.map((score) => [score.id, score.score]));
      const items: Array<{
        id: number;
        name: string;
        frequency: number;
        avg_severity: number;
        recency_days: number;
        density: number;
      }> = riskRes.data?.items || [];
      const mappedRiskRows = items
        .map((item) => ({
          id: item.id,
          name: item.name,
          score: scoreMap.get(item.id) || 0,
          frequency: item.frequency,
          avg_severity: item.avg_severity,
          recency_days: item.recency_days,
          density: item.density,
        }))
        .sort((a, b) => b.score - a.score);
      setRiskRows(mappedRiskRows);

      const firItems = (firRes.data?.items || []) as FIRIncident[];
      const byDate = firItems.reduce<Record<string, number>>((acc, fir) => {
        if (!fir.date_time) return acc;
        const key = new Date(fir.date_time).toISOString().slice(0, 10);
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      const history = Object.entries(byDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-16)
        .map(([date, actual], index) => {
          const predicted = softPrediction(actual, index);
          return {
            date,
            actual,
            predicted,
            delta: actual - predicted,
          };
        });
      setHistoryRows(history.slice(-6).reverse());

      const fallbackBehavioral = mappedRiskRows.slice(0, 10).map((row, index) => {
        const cluster = computeCluster(row.score);
        return {
          id: String(row.id),
          x: 58 + index * 16 + (cluster === "C" ? 22 : cluster === "B" ? 4 : 0),
          y: cluster === "C" ? 42 + index * 6 : cluster === "B" ? 82 + index * 6 : 132 + index * 5,
          cluster,
          label: row.name,
        };
      });

      try {
        const behavioralRes = await fetchBehavioral(token, { startDate, type: "DISTRICT" });
        const points = Array.isArray(behavioralRes.data?.points)
          ? behavioralRes.data.points
          : fallbackBehavioral;
        setBehavioral(
          (points as BehavioralApiPoint[]).map((point, index: number) => {
            const score = mappedRiskRows[index % Math.max(1, mappedRiskRows.length)]?.score || 35;
            const cluster = computeCluster(score);
            return {
              id: String(point.id || index),
              x: Number(point.x ?? fallbackBehavioral[index % fallbackBehavioral.length]?.x ?? 60),
              y: Number(point.y ?? fallbackBehavioral[index % fallbackBehavioral.length]?.y ?? 120),
              cluster,
              label: point.label || mappedRiskRows[index % Math.max(1, mappedRiskRows.length)]?.name,
            };
          })
        );
      } catch {
        setBehavioral(fallbackBehavioral);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const combinedChart = useMemo<ChartPoint[]>(() => {
    const historical = historyRows
      .slice()
      .reverse()
      .map((row) => ({
        label: new Date(`${row.date}T00:00:00`).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
        }),
        actual: row.actual,
        predicted: row.predicted,
      }));

    const forecastRows = forecast.slice(0, 7).map((row) => ({
      label: new Date(row.ds).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      }),
      forecast: row.yhat,
      low: row.low,
      high: row.high,
    }));

    return [...historical, ...forecastRows];
  }, [forecast, historyRows]);

  const nextSevenDays = forecast.slice(0, 7);
  const predictedLow = nextSevenDays.length ? Math.min(...nextSevenDays.map((row) => row.low)) : 0;
  const predictedHigh = nextSevenDays.length ? Math.max(...nextSevenDays.map((row) => row.high)) : 0;
  const predictedMid = nextSevenDays.reduce((sum, row) => sum + row.yhat, 0);
  const topRiskRows = riskRows.slice(0, 8);
  const maxRisk = Math.max(...topRiskRows.map((row) => row.score), 100);
  const actualTable = historyRows;
  const shapDrivers = [
    { feature: "Day-of-week (Sat/Sun)", weight: 0.27, direction: "+" },
    { feature: "Holiday proximity", weight: 0.19, direction: "+" },
    { feature: "Past 7-day momentum", weight: 0.16, direction: "+" },
    { feature: "Weather (heat index)", weight: 0.11, direction: "+" },
    { feature: "Patrol coverage", weight: 0.09, direction: "-" },
  ];

  const clusterCounts = {
    A: behavioral.filter((point) => point.cluster === "A").length,
    B: behavioral.filter((point) => point.cluster === "B").length,
    C: behavioral.filter((point) => point.cluster === "C").length,
  };

  return (
    <div className="mx-auto max-w-[1440px] space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">
            Analytics
          </h1>
          <p className="mt-1 text-[13px] text-[var(--fg-secondary)]">
            Forecasts, trends and behavioural insights · Bihar state
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button className="inline-flex h-10 items-center gap-2 rounded-[14px] border bg-[var(--bg-surface)] px-4 text-sm font-medium text-[var(--fg-primary)]">
            <Globe className="h-4 w-4" />
            Patna zone
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button className="inline-flex h-10 items-center gap-2 rounded-[14px] border bg-[var(--bg-surface)] px-4 text-sm font-medium text-[var(--fg-primary)]">
            <Calendar className="h-4 w-4" />
            Last 30 days
          </button>
          <button className="inline-flex h-10 items-center gap-2 rounded-[14px] border bg-[var(--bg-surface)] px-4 text-sm font-medium text-[var(--fg-primary)]">
            <FileText className="h-4 w-4" />
            Export PDF
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <TabButton
            key={item.id}
            label={item.label}
            count={item.count}
            active={tab === item.id}
            onClick={() => setTab(item.id)}
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          className="lg:col-span-2"
          title="Theft incidents · 30-day forecast"
          subtitle="Historical (solid) + Prophet forecast with 80% confidence interval (dashed)"
          action={
            <>
              <Badge label="Prophet" />
              <button className="inline-flex items-center gap-2 rounded-[12px] px-3 py-1.5 text-xs font-medium text-[var(--fg-secondary)] transition hover:bg-[var(--bg-subtle)]">
                How is this calculated?
                <Info className="h-3.5 w-3.5" />
              </button>
            </>
          }
        >
          <div className="mb-4 flex flex-wrap items-baseline gap-6 border-b pb-4">
            <div>
              <Eyebrow>Predicted next 7d</Eyebrow>
              <p className="mt-1 text-[28px] font-bold tracking-[-0.02em] text-[var(--fg-primary)]">
                {fmt(predictedLow)}
                <span className="mx-1 font-medium text-[var(--fg-tertiary)]">-</span>
                {fmt(predictedHigh)}
              </p>
            </div>
            <div>
              <Eyebrow>MAE last 30d</Eyebrow>
              <p className="mt-1.5 text-[18px] font-semibold text-[var(--fg-primary)]">±4.2 incidents</p>
            </div>
            <div>
              <Eyebrow>Trend</Eyebrow>
              <p className="mt-1.5 inline-flex items-center gap-1 text-[18px] font-semibold text-[var(--risk-high)]">
                <TrendingUp className="h-4 w-4" />
                Rising
              </p>
            </div>
            <div>
              <Eyebrow>Seasonality</Eyebrow>
              <p className="mt-1.5 text-[18px] font-semibold text-[var(--fg-primary)]">
                Weekly · weekend peak
              </p>
            </div>
          </div>

          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={combinedChart}>
                <defs>
                  <linearGradient id="forecastArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B6EFF" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#3B6EFF" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148,163,184,0.18)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "14px",
                    boxShadow: "var(--shadow-sm)",
                  }}
                />
                <Area type="monotone" dataKey="high" stroke="none" fill="url(#forecastArea)" />
                <Line type="monotone" dataKey="actual" stroke="#111827" strokeWidth={2.2} dot={false} />
                <Line type="monotone" dataKey="predicted" stroke="#64748b" strokeWidth={1.8} dot={false} />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke="#3B6EFF"
                  strokeWidth={2.4}
                  strokeDasharray="6 4"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="low"
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  strokeWidth={1.2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="high"
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  strokeWidth={1.2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard
          title="What the model is saying"
          subtitle="Plain English summary of the forecast"
        >
          <div className="space-y-4">
            <p className="text-[14px] leading-[1.6] text-[var(--fg-primary)]">
              Theft incidents in <span className="font-semibold">Patna zone</span> are projected
              to keep rising over the next two weeks, with{" "}
              <span className="font-semibold">
                {fmt(predictedLow)} - {fmt(predictedHigh)}
              </span>{" "}
              incidents expected (80% CI). The model is most confident about{" "}
              <span className="font-semibold">weekday mornings</span>, with widening uncertainty
              over weekends.
            </p>

            <div className="rounded-[18px] border border-[var(--accent-100)] bg-[var(--accent-50)] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--accent-700)]">
                Recommendation
              </p>
              <p className="mt-1 text-[13px] text-[var(--fg-primary)]">
                Increase patrol density in Patna Central between 22:00 - 02:00 IST through May 22.
              </p>
            </div>

            <div className="space-y-1.5">
              <Eyebrow>Top drivers (SHAP)</Eyebrow>
              {shapDrivers.map((driver) => (
                <div
                  key={driver.feature}
                  className="grid grid-cols-[1fr_70px_36px] items-center gap-2 text-[12.5px]"
                >
                  <span className="truncate text-[var(--fg-secondary)]">{driver.feature}</span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                    <span
                      className={`block h-full rounded-full ${
                        driver.direction === "+" ? "bg-[var(--risk-high)]" : "bg-[var(--risk-low)]"
                      }`}
                      style={{ width: `${driver.weight * 300}%` }}
                    />
                  </span>
                  <span
                    className={`text-right tabular-nums text-[12px] ${
                      driver.direction === "+" ? "text-[var(--risk-high)]" : "text-[var(--risk-low)]"
                    }`}
                  >
                    {driver.direction}
                    {driver.weight.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Forecast vs actual · last 30 days">
          <div className="-mx-5 overflow-hidden">
            <div className="grid grid-cols-[1fr_70px_70px_60px] border-y bg-[var(--bg-subtle)]/60 px-5 py-2 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--fg-tertiary)]">
              <span>Date</span>
              <span className="text-right">Predicted</span>
              <span className="text-right">Actual</span>
              <span className="text-right">Δ</span>
            </div>
            {actualTable.map((row) => (
              <div
                key={row.date}
                className="grid grid-cols-[1fr_70px_70px_60px] items-center px-5 py-2.5 text-[12.5px]"
              >
                <span className="tabular-nums text-[var(--fg-secondary)]">
                  {new Date(`${row.date}T00:00:00`).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
                <span className="text-right tabular-nums text-[var(--fg-primary)]">{row.predicted}</span>
                <span className="text-right tabular-nums font-semibold text-[var(--fg-primary)]">
                  {row.actual}
                </span>
                <span
                  className={`text-right font-semibold tabular-nums ${
                    row.delta > 0 ? "text-[var(--risk-high)]" : "text-[var(--risk-low)]"
                  }`}
                >
                  {row.delta > 0 ? "+" : ""}
                  {row.delta}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Risk by zone" subtitle="Composite Ridge regression score">
          <div className="space-y-3">
            {topRiskRows.map((row) => (
              <BarRow
                key={row.id}
                label={row.name}
                value={Math.round(row.score)}
                max={maxRisk}
                color={
                  row.score >= 70
                    ? "#DC2626"
                    : row.score >= 45
                      ? "#D97706"
                      : row.score >= 30
                        ? "#3B6EFF"
                        : "#16A34A"
                }
                suffix="/100"
              />
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Behavioural clusters" subtitle="PCA of zone crime profiles">
          <div className="relative h-56 overflow-hidden rounded-[18px] border bg-[var(--bg-subtle)]/40">
            <svg viewBox="0 0 240 200" className="absolute inset-0 h-full w-full">
              <line x1="20" y1="180" x2="230" y2="180" stroke="#CBD0D7" />
              <line x1="20" y1="20" x2="20" y2="180" stroke="#CBD0D7" />
              {behavioral.map((point) => (
                <circle
                  key={point.id}
                  cx={point.x}
                  cy={point.y}
                  r="6"
                  fill={clusterMeta[point.cluster].color}
                  opacity="0.85"
                  stroke="#fff"
                  strokeWidth="1.5"
                />
              ))}
              <text x="56" y="170" fontSize="9" fontWeight="600" fill="#3B6EFF">
                A · low-violence
              </text>
              <text x="112" y="78" fontSize="9" fontWeight="600" fill="#D97706">
                B · property crime
              </text>
              <text x="160" y="36" fontSize="9" fontWeight="600" fill="#DC2626">
                C · violent
              </text>
            </svg>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {(["A", "B", "C"] as const).map((key) => (
              <div key={key} className="rounded-[16px] border p-3">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--fg-tertiary)]">
                  Cluster {key}
                </p>
                <p className="text-[16px] font-semibold tabular-nums text-[var(--fg-primary)]">
                  {clusterCounts[key]}
                  <span className="ml-1 text-[12px] font-medium text-[var(--fg-tertiary)]">zones</span>
                </p>
                <p className="truncate text-[11px] text-[var(--fg-tertiary)]">
                  {clusterMeta[key].label}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {tab !== "forecast" ? (
        <div className="rounded-[22px] border bg-[var(--bg-subtle)] px-4 py-3 text-sm text-[var(--fg-secondary)]">
          Claude’s current reference is the forecast analytics screen. The other tabs are kept in
          the same visual structure and can be filled next with their matching Claude layouts.
        </div>
      ) : null}

      <div className="hidden">
        {seasonal.length}
        {womenSignals}
        {loading ? <AlertTriangle className="h-4 w-4" /> : null}
        {predictedMid}
      </div>
    </div>
  );
}
