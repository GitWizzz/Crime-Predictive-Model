"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { fetchFIRs } from "@/services/hotspots";
import { fetchForecast } from "@/services/ml";

type SeriesPoint = {
  ds: string;
  y: number;
};

type ForecastPoint = {
  ds: string;
  yhat: number;
  yhat_lower: number;
  yhat_upper: number;
};

const buildSeries = (firs: any[]): SeriesPoint[] => {
  const bucket = new Map();
  firs.forEach((fir) => {
    if (!fir.date_time) return;
    const date = new Date(fir.date_time);
    const key = date.toISOString().slice(0, 10);
    bucket.set(key, (bucket.get(key) || 0) + 1);
  });

  const series = Array.from(bucket.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({
      ds: `${key}T00:00:00Z`,
      y: value,
    }));

  return series;
};

export default function ReportsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [periods, setPeriods] = useState(14);
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [forecast, setForecast] = useState<ForecastPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setToken(window.localStorage.getItem("authToken"));
    }
  }, []);

  const loadForecast = async () => {
    if (!token) {
      setError("Missing auth token. Set localStorage key authToken after login.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetchFIRs(token, { limit: 200 });
      const firs = res.data?.items || [];
      const builtSeries = buildSeries(firs);

      if (builtSeries.length < 2) {
        throw new Error("Not enough FIR data to generate forecast.");
      }

      setSeries(builtSeries);
      const forecastRes = await fetchForecast(token, {
        series: builtSeries,
        periods: Number(periods) || 14,
        freq: "D",
      });

      setForecast(forecastRes.data?.points || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Forecast failed.");
    } finally {
      setLoading(false);
    }
  };

  const lastActual = useMemo(() => series.slice(-14), [series]);
  const chartData = useMemo(() => {
    const map = new Map<string, { date: string; actual?: number; forecast?: number }>();

    series.forEach((point) => {
      const date = point.ds.slice(0, 10);
      map.set(date, { date, actual: point.y });
    });

    forecast.forEach((point) => {
      const date = point.ds.slice(0, 10);
      const existing = map.get(date) || { date };
      existing.forecast = point.yhat;
      map.set(date, existing);
    });

    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [series, forecast]);

  return (
    <div className="space-y-4">
      <div className="dash-card dash-card-hover p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-sm text-zinc-500">Forecast days</label>
            <Input
              type="number"
              min={7}
              max={60}
              value={periods}
              onChange={(event) => setPeriods(Number(event.target.value))}
              className="w-32"
            />
          </div>
          <Button onClick={loadForecast} disabled={loading}>
            {loading ? "Generating..." : "Generate Forecast"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="dash-card dash-card-hover p-4">
        <div className="text-sm text-zinc-500 mb-3">Prediction Chart</div>
        {chartData.length === 0 ? (
          <div className="text-sm text-zinc-500">No chart data yet.</div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Actual"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  name="Forecast"
                  stroke="#16a34a"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="dash-card dash-card-hover">
          <div className="border-b px-4 py-2 text-sm text-zinc-500">
            Last 14 days (Actual)
          </div>
          <div className="p-4">
            {lastActual.length === 0 ? (
              <div className="text-sm text-zinc-500">No data yet.</div>
            ) : (
              <ul className="space-y-2 text-sm">
                {lastActual.map((point) => (
                  <li key={point.ds} className="flex justify-between">
                    <span>{point.ds.slice(0, 10)}</span>
                    <span className="font-medium">{point.y}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="dash-card dash-card-hover">
          <div className="border-b px-4 py-2 text-sm text-zinc-500">
            Forecast (Next {periods} days)
          </div>
          <div className="p-4">
            {forecast.length === 0 ? (
              <div className="text-sm text-zinc-500">No forecast generated.</div>
            ) : (
              <ul className="space-y-2 text-sm">
                {forecast.map((point) => (
                  <li key={point.ds} className="flex justify-between">
                    <span>{point.ds.slice(0, 10)}</span>
                    <span className="font-medium">{point.yhat.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
