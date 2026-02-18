"use client";

import { useEffect, useState } from "react";
import { fetchBehavioral } from "@/services/analytics";

export default function BehavioralPage() {
  const [token, setToken] = useState<string | null>(null);
  const [clusters, setClusters] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [filters, setFilters] = useState({ startDate: "", endDate: "" });

  useEffect(() => {
    if (typeof window !== "undefined") {
      setToken(window.localStorage.getItem("authToken"));
    }
  }, []);

  const loadData = async () => {
    if (!token) return;
    const payload: Record<string, string> = {};
    if (filters.startDate) payload.startDate = filters.startDate;
    if (filters.endDate) payload.endDate = filters.endDate;
    const res = await fetchBehavioral(token, payload);
    setClusters(res.data?.clusters?.clusters || []);
    setIncidents(res.data?.incidents || []);
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
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-zinc-500">Behavioral Clusters</p>
          <p className="text-2xl font-semibold">{clusters.length}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-zinc-500">Tagged Incidents</p>
          <p className="text-2xl font-semibold">{incidents.length}</p>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <h3 className="text-sm font-semibold text-zinc-700">Incident Pattern Tags</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-2">Incident ID</th>
                <th className="px-3 py-2">Crime Type</th>
                <th className="px-3 py-2">Severity</th>
                <th className="px-3 py-2">Tags</th>
              </tr>
            </thead>
            <tbody>
              {incidents.slice(0, 50).map((incident: any) => (
                <tr key={incident.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{incident.id}</td>
                  <td className="px-3 py-2">{incident.crime_type}</td>
                  <td className="px-3 py-2">{incident.severity}</td>
                  <td className="px-3 py-2">
                    {(incident.tags || []).join(", ") || "-"}
                  </td>
                </tr>
              ))}
              {incidents.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-center text-sm text-zinc-500" colSpan={4}>
                    No behavioral data yet.
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
