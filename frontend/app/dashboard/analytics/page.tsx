"use client";

import { useEffect, useState } from "react";
import {
  fetchForecast,
  fetchSeasonalTrends,
  fetchRiskScores,
  fetchZoneAnalytics,
} from "@/services/analytics";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar } from "recharts";

export default function AnalyticsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [forecast, setForecast] = useState<any[]>([]);
  const [seasonal, setSeasonal] = useState<any[]>([]);
  const [riskRows, setRiskRows] = useState<any[]>([]);
  const [zoneAnalytics, setZoneAnalytics] = useState<any[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>("");
  const [filters, setFilters] = useState({ startDate: "", endDate: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setToken(window.localStorage.getItem("authToken"));
    }
  }, []);

  const loadData = async () => {
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
        (forecastRes.data?.points || []).map((p: any) => ({
          ds: new Date(p.ds).toLocaleDateString(),
          yhat: p.yhat,
          low: p.yhat_lower,
          high: p.yhat_upper,
        }))
      );
      setSeasonal(seasonalRes.data || []);

      const scores = riskRes.data?.scores || [];
      const scoreMap = new Map(scores.map((s: any) => [s.id, s.score]));
      const items = riskRes.data?.items || [];
      setRiskRows(
        items
          .map((item: any) => ({
            id: item.id,
            name: item.name,
            score: scoreMap.get(item.id) || 0,
            frequency: item.frequency,
            avg_severity: item.avg_severity,
            recency_days: item.recency_days,
            density: item.density,
          }))
          .sort((a: any, b: any) => b.score - a.score)
      );

      const zoneRes = await fetchZoneAnalytics(token, { ...params, type: "DISTRICT" });
      const zones = zoneRes.data || [];
      setZoneAnalytics(zones);
      if (!selectedZone && zones.length) {
        setSelectedZone(zones[0].name);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token, filters]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-white p-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-600">
          <span>Date range:</span>
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
        <div className="rounded-lg border bg-white p-4">
          <h3 className="text-sm font-semibold text-zinc-700">30-Day Crime Forecast</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecast}>
                <XAxis dataKey="ds" tick={{ fontSize: 10 }} interval={4} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="yhat" stroke="#2563eb" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4">
          <h3 className="text-sm font-semibold text-zinc-700">Seasonal Trend (Monthly)</h3>
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

      <div className="rounded-lg border bg-white p-4">
        <h3 className="text-sm font-semibold text-zinc-700">District Risk Scores</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
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
                <tr key={row.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{row.name}</td>
                  <td className="px-3 py-2 font-semibold">{row.score.toFixed(1)}</td>
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

      <div className="rounded-lg border bg-white p-4">
        <h3 className="text-sm font-semibold text-zinc-700">Zone Breakdown</h3>
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
              <ul className="mt-2 space-y-1">
                {Object.entries(
                  zoneAnalytics.find((z) => z.name === selectedZone)?.crime_breakdown || {}
                ).map(([key, value]) => (
                  <li key={key} className="flex justify-between">
                    <span>{key}</span>
                    <span>{value as number}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs uppercase text-zinc-400">Category Breakdown</div>
              <ul className="mt-2 space-y-1">
                {Object.entries(
                  zoneAnalytics.find((z) => z.name === selectedZone)?.category_breakdown || {}
                ).map(([key, value]) => (
                  <li key={key} className="flex justify-between">
                    <span>{key}</span>
                    <span>{value as number}</span>
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
