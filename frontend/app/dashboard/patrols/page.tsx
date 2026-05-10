"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { generatePatrolRoute, fetchPatrolRoutes, fetchPatrolRouteById } from "@/services/patrol";
import { apiGet } from "@/services/api";
import { Route, Calendar, MapPin, RefreshCcw, Zap } from "lucide-react";

const PatrolMap = dynamic(() => import("@/components/map/PatrolMap"), { ssr: false });

const riskColor = (score: number) => {
  if (score >= 7) return "text-[var(--risk-high)] bg-[var(--risk-high-bg)]";
  if (score >= 4) return "text-[var(--risk-medium)] bg-[var(--risk-medium-bg)]";
  return "text-[var(--risk-low)] bg-[var(--risk-low-bg)]";
};

const shiftColor = (shift: string) => {
  const s = (shift || "").toUpperCase();
  if (s.includes("NIGHT")) return "text-[var(--risk-high)] bg-[var(--risk-high-bg)]";
  if (s.includes("EVENING") || s.includes("AFTERNOON")) return "text-[var(--risk-medium)] bg-[var(--risk-medium-bg)]";
  return "text-[var(--risk-low)] bg-[var(--risk-low-bg)]";
};

export default function PatrolsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [routes, setRoutes] = useState<any[]>([]);
  const [activeRoute, setActiveRoute] = useState<any | null>(null);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ type: "DISTRICT", num_vehicles: 1, max_stops: 8 });

  useEffect(() => {
    if (typeof window !== "undefined") setToken(window.localStorage.getItem("authToken"));
  }, []);

  const loadRoutes = async () => {
    if (!token) return;
    const res = await fetchPatrolRoutes(token);
    setRoutes(res.data || []);
  };

  useEffect(() => { loadRoutes(); }, [token]);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      const res = await apiGet("/api/patrol/schedule", token);
      setSchedule(res.data || []);
    };
    load();
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
    <div className="mx-auto max-w-[1440px] space-y-5">

      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">Patrol Routes</h1>
        <p className="mt-1 text-[13px] text-[var(--fg-secondary)]">Risk-based route generation and scheduling for field deployment</p>
      </div>

      {/* Generate card */}
      <section className="surface-card rounded-[22px] p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-50)]">
              <Zap className="h-4 w-4 text-[var(--accent-500)]" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-[var(--fg-primary)]">Generate Patrol Route</h2>
              <p className="text-[12px] text-[var(--fg-tertiary)]">AI-optimised route from crime density data</p>
            </div>
          </div>
          <button
            onClick={loadRoutes}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--fg-secondary)] hover:bg-[var(--bg-muted)]"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--fg-tertiary)]">Route type</label>
            <select
              value={form.type}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
              className="h-10 rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 text-sm text-[var(--fg-primary)]"
            >
              <option value="DISTRICT">District</option>
              <option value="STATION">Station</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--fg-tertiary)]">Vehicles</label>
            <input
              type="number" min={1} value={form.num_vehicles}
              onChange={(e) => setForm((p) => ({ ...p, num_vehicles: Number(e.target.value) }))}
              className="h-10 w-24 rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 text-sm text-[var(--fg-primary)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--fg-tertiary)]">Max stops</label>
            <input
              type="number" min={3} value={form.max_stops}
              onChange={(e) => setForm((p) => ({ ...p, max_stops: Number(e.target.value) }))}
              className="h-10 w-24 rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 text-sm text-[var(--fg-primary)]"
            />
          </div>
          <button
            onClick={handleGenerate} disabled={loading}
            className="flex h-10 items-center gap-2 rounded-lg bg-[var(--accent-500)] px-5 text-sm font-semibold text-white hover:bg-[var(--accent-600)] disabled:opacity-60"
          >
            <Route className="h-4 w-4" />
            {loading ? "Generating…" : "Generate Route"}
          </button>
        </div>
      </section>

      {/* Map */}
      {activeRoute?.stops?.length ? (
        <PatrolMap stops={activeRoute.stops} />
      ) : (
        <section className="surface-card flex items-center justify-center gap-3 rounded-[22px] py-14 text-sm text-[var(--fg-tertiary)]">
          <MapPin className="h-5 w-5" />
          Generate a route to preview the patrol path on the map
        </section>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        {/* Saved routes */}
        <section className="surface-card rounded-[22px] p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--bg-subtle)]">
              <Route className="h-4 w-4 text-[var(--fg-secondary)]" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-[var(--fg-primary)]">Saved Patrol Routes</h2>
              <p className="text-[12px] text-[var(--fg-tertiary)]">Click a route to load it on the map</p>
            </div>
          </div>
          <div className="overflow-hidden rounded-[14px] border border-[var(--border-default)]">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="bg-[var(--bg-subtle)]">
                  {["Route", "Status", "Risk"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--fg-tertiary)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {routes.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-sm text-[var(--fg-tertiary)]">No routes yet.</td></tr>
                ) : routes.map((route) => (
                  <tr
                    key={route.id}
                    className="cursor-pointer transition-colors hover:bg-[var(--bg-subtle)]"
                    onClick={async () => {
                      if (!token) return;
                      const detail = await fetchPatrolRouteById(token, route.id);
                      setActiveRoute(detail.data);
                    }}
                  >
                    <td className="px-4 py-3 font-medium text-[var(--fg-primary)]">{route.name}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-[var(--bg-subtle)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--fg-secondary)]">{route.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${riskColor(Number(route.risk_score))}`}>
                        {Number(route.risk_score).toFixed(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Schedule */}
        <section className="surface-card rounded-[22px] p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--bg-subtle)]">
              <Calendar className="h-4 w-4 text-[var(--fg-secondary)]" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-[var(--fg-primary)]">Risk-Based Schedule</h2>
              <p className="text-[12px] text-[var(--fg-tertiary)]">Recommended patrol shifts by zone risk</p>
            </div>
          </div>
          <div className="overflow-hidden rounded-[14px] border border-[var(--border-default)]">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="bg-[var(--bg-subtle)]">
                  {["Zone", "Risk", "Recommended shift"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--fg-tertiary)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {schedule.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-sm text-[var(--fg-tertiary)]">No schedule data yet.</td></tr>
                ) : schedule.slice(0, 15).map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-[var(--bg-subtle)]">
                    <td className="px-4 py-3 font-medium text-[var(--fg-primary)]">{row.name}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${riskColor(Number(row.score))}`}>
                        {Number(row.score).toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${shiftColor(row.recommended_shift)}`}>
                        {row.recommended_shift}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
