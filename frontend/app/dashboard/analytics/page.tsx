"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchForecast,
  fetchSeasonalTrends,
  fetchRiskScores,
  fetchZoneAnalytics,
} from "@/services/analytics";
import { Activity, AlertTriangle, CalendarRange, ChartLine } from "lucide-react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
  CartesianGrid,
  Area,
} from "recharts";

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

type ZoneRow = {
  id: number;
  name: string;
  total: number;
  crime_breakdown: Record<string, number>;
  category_breakdown: Record<string, number>;
};

const fmt = (value: number) => new Intl.NumberFormat("en-IN").format(Math.round(value));
const scoreTone = (score: number) =>
  score >= 70 ? "text-rose-300" : score >= 45 ? "text-amber-300" : "text-emerald-300";

export default function AnalyticsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [forecast, setForecast] = useState<ForecastPoint[]>([]);
  const [seasonal, setSeasonal] = useState<SeasonalRow[]>([]);
  const [riskRows, setRiskRows] = useState<RiskRow[]>([]);
  const [zoneAnalytics, setZoneAnalytics] = useState<ZoneRow[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>("");
  const [filters, setFilters] = useState({ startDate: "", endDate: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setToken(window.localStorage.getItem("authToken"));
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const [forecastRes, seasonalRes, riskRes] = await Promise.all([
        fetchForecast(token, { ...params, interval: "day", periods: 30, freq: "D" }),
        fetchSeasonalTrends(token, { ...params, granularity: "month" }),
        fetchRiskScores(token, { ...params, type: "DISTRICT" }),
      ]);

      setForecast(
        (forecastRes.data?.points || []).map((p: { ds: string; yhat: number; yhat_lower: number; yhat_upper: number }) => ({
          ds: new Date(p.ds).toLocaleDateString(),
          yhat: p.yhat,
          low: p.yhat_lower,
          high: p.yhat_upper,
        }))
      );
      setSeasonal(seasonalRes.data || []);

      const scores: Array<{ id: number; score: number }> = riskRes.data?.scores || [];
      const scoreMap = new Map(scores.map((s) => [s.id, s.score]));
      const items: Array<{
        id: number;
        name: string;
        frequency: number;
        avg_severity: number;
        recency_days: number;
        density: number;
      }> = riskRes.data?.items || [];
      setRiskRows(
        items
          .map((item) => ({
            id: item.id,
            name: item.name,
            score: scoreMap.get(item.id) || 0,
            frequency: item.frequency,
            avg_severity: item.avg_severity,
            recency_days: item.recency_days,
            density: item.density,
          }))
          .sort((a, b) => b.score - a.score)
      );

      const zoneRes = await fetchZoneAnalytics(token, { ...params, type: "DISTRICT" });
      const zones: ZoneRow[] = zoneRes.data || [];
      setZoneAnalytics(zones);
      if (!selectedZone && zones.length) {
        setSelectedZone(zones[0].name);
      }
    } finally {
      setLoading(false);
    }
  }, [token, filters, selectedZone]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const highRiskCount = riskRows.filter((r) => r.score >= 70).length;
  const avgRisk = riskRows.length
    ? riskRows.reduce((acc, row) => acc + row.score, 0) / riskRows.length
    : 0;
  const forecastAvg = forecast.length
    ? forecast.reduce((acc, row) => acc + (Number(row.yhat) || 0), 0) / forecast.length
    : 0;
  const selectedZoneData = zoneAnalytics.find((z) => z.name === selectedZone);
  const forecastStats = {
    avg: forecast.length
      ? forecast.reduce((acc, row) => acc + (Number(row.yhat) || 0), 0) / forecast.length
      : 0,
    min: forecast.length ? Math.min(...forecast.map((row) => Number(row.low) || 0)) : 0,
    max: forecast.length ? Math.max(...forecast.map((row) => Number(row.high) || 0)) : 0,
  };

  return (
    <div className="space-y-5">
      <div className="dash-card dash-card-hover p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-300/80">Intelligence Layer</p>
            <h2 className="mt-1 text-2xl font-semibold text-zinc-100">Predictive Analytics Console</h2>
          </div>
          <div className="ml-auto text-xs text-zinc-400">{loading ? "Refreshing metrics..." : "Live metrics loaded"}</div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/75 p-3">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Average Risk Score</span>
              <AlertTriangle className="h-4 w-4 text-amber-300" />
            </div>
            <p className={`mt-1 text-2xl font-semibold ${scoreTone(avgRisk)}`}>{loading ? "..." : avgRisk.toFixed(1)}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/75 p-3">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>High-Risk Districts</span>
              <Activity className="h-4 w-4 text-rose-300" />
            </div>
            <p className="mt-1 text-2xl font-semibold text-zinc-100">{loading ? "..." : highRiskCount}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/75 p-3">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Forecast Avg / Day</span>
              <ChartLine className="h-4 w-4 text-cyan-300" />
            </div>
            <p className="mt-1 text-2xl font-semibold text-zinc-100">{loading ? "..." : fmt(forecastAvg)}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/75 p-3">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Districts Modeled</span>
              <CalendarRange className="h-4 w-4 text-emerald-300" />
            </div>
            <p className="mt-1 text-2xl font-semibold text-zinc-100">{loading ? "..." : zoneAnalytics.length}</p>
          </div>
        </div>
      </div>

      <div className="dash-card dash-card-hover p-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-600">
          <span className="text-xs uppercase tracking-wide text-zinc-400">Date Range</span>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
            className="rounded border px-2 py-1 text-sm"
          />
          <span>to</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
            className="rounded border px-2 py-1 text-sm"
          />
          <button
            className="rounded border px-2 py-1 text-sm"
            onClick={() => setFilters({ startDate: "", endDate: "" })}
          >
            Clear
          </button>
          <span className="ml-auto text-xs text-zinc-400">
            {loading ? "Loading..." : "Updated"}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="dash-card dash-card-hover p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-200">30-Day Crime Forecast</h3>
            <span className="rounded-full border border-cyan-500/35 bg-cyan-500/10 px-2 py-0.5 text-[11px] text-cyan-300">
              Trend
            </span>
          </div>
          <div className="mb-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/75 px-2 py-1.5 text-xs">
              <p className="text-zinc-400">Avg / day</p>
              <p className="mt-0.5 font-semibold text-cyan-300">{forecastStats.avg.toFixed(1)}</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/75 px-2 py-1.5 text-xs">
              <p className="text-zinc-400">Lower band</p>
              <p className="mt-0.5 font-semibold text-emerald-300">{forecastStats.min.toFixed(1)}</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/75 px-2 py-1.5 text-xs">
              <p className="text-zinc-400">Upper band</p>
              <p className="mt-0.5 font-semibold text-amber-300">{forecastStats.max.toFixed(1)}</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecast}>
                <defs>
                  <linearGradient id="forecastBand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(113,113,122,0.28)" />
                <XAxis dataKey="ds" tick={{ fontSize: 10 }} interval={4} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(15,23,42,0.92)",
                    border: "1px solid rgba(56,189,248,0.35)",
                    borderRadius: "10px",
                    color: "#e2e8f0",
                  }}
                />
                <Area type="monotone" dataKey="high" stroke="none" fill="url(#forecastBand)" />
                <Line type="monotone" dataKey="low" stroke="#22c55e" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="high" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="yhat" stroke="#38bdf8" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-zinc-400">
            Forecast line shows expected incidents; green/amber lines represent lower and upper confidence range.
          </p>
        </div>

        <div className="dash-card dash-card-hover p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-200">Seasonal Trend (Monthly)</h3>
            <span className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-300">
              Seasonality
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={seasonal}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="total" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="dash-card dash-card-hover p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-200">District Risk Scores</h3>
          <span className="text-xs text-zinc-400">Sorted high to low</span>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-2">District</th>
                <th className="px-3 py-2">Risk Score</th>
                <th className="px-3 py-2">Frequency</th>
                <th className="px-3 py-2">Avg Severity</th>
                <th className="px-3 py-2">Recency (days)</th>
              </tr>
            </thead>
            <tbody>
              {riskRows.map((row) => (
                <tr key={row.id} className="last:border-0">
                  <td className="px-3 py-2">{row.name}</td>
                  <td className="px-3 py-2 font-semibold">
                    <div className="flex items-center gap-2">
                      <span className={scoreTone(row.score)}>{row.score.toFixed(1)}</span>
                      <div className="h-1.5 w-20 rounded-full bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-cyan-400"
                          style={{ width: `${Math.min(100, Math.max(2, row.score))}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">{row.frequency?.toFixed?.(0) ?? row.frequency}</td>
                  <td className="px-3 py-2">{row.avg_severity?.toFixed?.(1) ?? row.avg_severity}</td>
                  <td className="px-3 py-2">{row.recency_days?.toFixed?.(0) ?? row.recency_days}</td>
                </tr>
              ))}
              {riskRows.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-center text-sm text-zinc-500" colSpan={5}>
                    No risk data yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="dash-card dash-card-hover p-4">
        <h3 className="text-sm font-semibold text-zinc-200">Zone Breakdown</h3>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-600">
          <span>District:</span>
          <select
            className="rounded border px-2 py-1 text-sm"
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
          >
            {zoneAnalytics.map((z) => (
              <option key={z.id} value={z.name}>
                {z.name}
              </option>
            ))}
          </select>
        </div>
        {selectedZone && (
          <div className="mt-3 grid gap-4 md:grid-cols-2 text-sm text-zinc-700">
            <div>
              <div className="text-xs uppercase text-zinc-400">Crime Breakdown</div>
              <ul className="mt-2 space-y-2">
                {Object.entries(
                  selectedZoneData?.crime_breakdown || {}
                ).map(([key, value]) => (
                  <li key={key} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/70 px-2 py-1.5">
                    <span>{key}</span>
                    <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-xs">{value as number}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs uppercase text-zinc-400">Category Breakdown</div>
              <ul className="mt-2 space-y-2">
                {Object.entries(
                  selectedZoneData?.category_breakdown || {}
                ).map(([key, value]) => (
                  <li key={key} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/70 px-2 py-1.5">
                    <span>{key}</span>
                    <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-xs">{value as number}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
