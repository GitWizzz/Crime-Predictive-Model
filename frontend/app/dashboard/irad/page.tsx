"use client";

import { useEffect, useState } from "react";
import HotspotsMap from "@/components/map/HotspotsMap";
import { fetchZones } from "@/services/zones";
import { fetchIradHotspots, fetchIradAccidents, ingestIradAccidents } from "@/services/irad";

export default function IradPage() {
  const [token, setToken] = useState<string | null>(null);
  const [districtsGeo, setDistrictsGeo] = useState<any | null>(null);
  const [heatPoints, setHeatPoints] = useState<any[]>([]);
  const [accidents, setAccidents] = useState<any[]>([]);
  const [filters, setFilters] = useState({ startDate: "", endDate: "" });
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setToken(window.localStorage.getItem("authToken"));
    }
  }, []);

  useEffect(() => {
    const loadZones = async () => {
      if (!token) return;
      const res = await fetchZones(token, { type: "DISTRICT" });
      setDistrictsGeo(res.data?.geojson || null);
    };
    loadZones();
  }, [token]);

  const loadAccidents = async () => {
    if (!token) return;
    const params: Record<string, string> = {};
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    const [heatRes, listRes] = await Promise.all([
      fetchIradHotspots(token, params),
      fetchIradAccidents(token, params),
    ]);
    setHeatPoints(heatRes.data?.heat_points || []);
    setAccidents(listRes.data || []);
  };

  useEffect(() => {
    loadAccidents();
  }, [token, filters]);

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !token) return;
    const text = await file.text();
    const parsed = JSON.parse(text);
    const items = Array.isArray(parsed) ? parsed : parsed.items;
    if (!Array.isArray(items)) {
      setMessage("Invalid IRAD JSON format.");
      return;
    }
    const res = await ingestIradAccidents(token, items);
    setMessage(`Inserted ${res.data?.inserted || 0} accident records.`);
    await loadAccidents();
    event.target.value = "";
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-white p-4 space-y-2">
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
        <div className="text-sm text-zinc-500">
          Upload IRAD accidents JSON to ingest.
          <input type="file" accept=".json" onChange={handleImport} className="ml-2 text-sm" />
        </div>
        {message && <div className="text-sm text-emerald-600">{message}</div>}
      </div>

      <HotspotsMap
        mode="kde"
        hotspots={[]}
        heatPoints={[]}
        accidentHeatPoints={heatPoints}
        districts={districtsGeo}
      />

      <div className="rounded-lg border bg-white p-4">
        <h3 className="text-sm font-semibold text-zinc-700">Accident Records</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-2">Accident ID</th>
                <th className="px-3 py-2">Date/Time</th>
                <th className="px-3 py-2">Severity</th>
                <th className="px-3 py-2">District</th>
              </tr>
            </thead>
            <tbody>
              {accidents.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{row.accident_id}</td>
                  <td className="px-3 py-2">{new Date(row.date_time).toLocaleString()}</td>
                  <td className="px-3 py-2">{row.severity}</td>
                  <td className="px-3 py-2">{row.district || "-"}</td>
                </tr>
              ))}
              {accidents.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-center text-sm text-zinc-500" colSpan={4}>
                    No accident records yet.
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
