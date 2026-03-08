"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { generatePatrolRoute, fetchPatrolRoutes, fetchPatrolRouteById } from "@/services/patrol";
import { apiGet } from "@/services/api";

const PatrolMap = dynamic(() => import("@/components/map/PatrolMap"), { ssr: false });

export default function PatrolsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [routes, setRoutes] = useState<any[]>([]);
  const [activeRoute, setActiveRoute] = useState<any | null>(null);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ type: "DISTRICT", num_vehicles: 1, max_stops: 8 });

  useEffect(() => {
    if (typeof window !== "undefined") {
      setToken(window.localStorage.getItem("authToken"));
    }
  }, []);

  const loadRoutes = async () => {
    if (!token) return;
    const res = await fetchPatrolRoutes(token);
    setRoutes(res.data || []);
  };

  useEffect(() => {
    loadRoutes();
  }, [token]);

  useEffect(() => {
    const loadSchedule = async () => {
      if (!token) return;
      const res = await apiGet("/api/patrol/schedule", token);
      setSchedule(res.data || []);
    };
    loadSchedule();
  }, [token]);

  const handleGenerate = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await generatePatrolRoute(token, form);
      const created = res.data?.routes?.[0];
      if (created?.id) {
        const detail = await fetchPatrolRouteById(token, created.id);
        setActiveRoute(detail.data);
      }
      await loadRoutes();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="dash-card dash-card-hover p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-600">
          <span>Route type:</span>
          <select
            className="rounded border px-2 py-1 text-sm"
            value={form.type}
            onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
          >
            <option value="DISTRICT">District</option>
            <option value="STATION">Station</option>
          </select>
          <span>Vehicles:</span>
          <input
            type="number"
            className="rounded border px-2 py-1 text-sm w-20"
            value={form.num_vehicles}
            onChange={(e) => setForm((prev) => ({ ...prev, num_vehicles: Number(e.target.value) }))}
            min={1}
          />
          <span>Max Stops:</span>
          <input
            type="number"
            className="rounded border px-2 py-1 text-sm w-20"
            value={form.max_stops}
            onChange={(e) => setForm((prev) => ({ ...prev, max_stops: Number(e.target.value) }))}
            min={3}
          />
          <button
            className="rounded-lg border bg-zinc-900 px-3 py-1 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? "Generating..." : "Generate Route"}
          </button>
        </div>
      </div>

      {activeRoute?.stops?.length ? (
        <PatrolMap stops={activeRoute.stops} />
      ) : (
        <div className="dash-card dash-card-hover p-6 text-sm text-zinc-500">
          Generate a route to preview the patrol path.
        </div>
      )}

      <div className="dash-card dash-card-hover p-4">
        <h3 className="text-sm font-semibold text-zinc-700">Saved Patrol Routes</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-2">Route</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Risk</th>
              </tr>
            </thead>
            <tbody>
              {routes.map((route) => (
                <tr
                  key={route.id}
                  className="border-b last:border-0 cursor-pointer"
                  onClick={async () => {
                    if (!token) return;
                    const detail = await fetchPatrolRouteById(token, route.id);
                    setActiveRoute(detail.data);
                  }}
                >
                  <td className="px-3 py-2">{route.name}</td>
                  <td className="px-3 py-2">{route.status}</td>
                  <td className="px-3 py-2">{Number(route.risk_score).toFixed(1)}</td>
                </tr>
              ))}
              {routes.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-center text-sm text-zinc-500" colSpan={3}>
                    No routes yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="dash-card dash-card-hover p-4">
        <h3 className="text-sm font-semibold text-zinc-700">Risk-Based Patrol Schedule</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-2">Zone</th>
                <th className="px-3 py-2">Risk Score</th>
                <th className="px-3 py-2">Recommended Shift</th>
              </tr>
            </thead>
            <tbody>
              {schedule.slice(0, 15).map((row) => (
                <tr key={row.id} className="last:border-0">
                  <td className="px-3 py-2">{row.name}</td>
                  <td className="px-3 py-2">{Number(row.score).toFixed(1)}</td>
                  <td className="px-3 py-2">{row.recommended_shift}</td>
                </tr>
              ))}
              {schedule.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-center text-sm text-zinc-500" colSpan={3}>
                    No schedule data yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
