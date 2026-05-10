"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { GeoJsonObject } from "geojson";
import { Calendar, Filter, TrafficCone } from "lucide-react";
import { fetchZones } from "@/services/zones";
import { fetchIradAccidents, fetchIradHotspots } from "@/services/irad";

const AccidentMap = dynamic(() => import("@/components/map/AccidentMap"), { ssr: false });

type HeatPoint = { lat: number; lon: number; intensity: number };
type AccidentRow = { id: number; district?: string | null; severity?: string | null; road_type?: string | null };

const DATE_OPTIONS = [
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "Last 180 days", days: 180 },
];

const SEVERITY_OPTIONS = ["Any", "Fatal", "Grievous", "Minor"];
const ROAD_OPTIONS = ["All", "NH", "SH", "MDR", "Urban"];

export default function IradPage() {
  const [token] = useState<string | null>(() =>
    typeof window !== "undefined" ? window.localStorage.getItem("authToken") : null
  );
  const [districtsGeo, setDistrictsGeo] = useState<GeoJsonObject | null>(null);
  const [stateBoundary, setStateBoundary] = useState<GeoJsonObject | null>(null);
  const [heatPoints, setHeatPoints] = useState<HeatPoint[]>([]);
  const [accidents, setAccidents] = useState<AccidentRow[]>([]);

  const [dateDays, setDateDays] = useState(90);
  const [severity, setSeverity] = useState("Any");
  const [roadType, setRoadType] = useState("All");
  const [showDateMenu, setShowDateMenu] = useState(false);
  const [showSevMenu, setShowSevMenu] = useState(false);
  const [showRoadMenu, setShowRoadMenu] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      const startDate = new Date(Date.now() - dateDays * 86400_000).toISOString().slice(0, 10);
      const params: Record<string, string> = { startDate };
      if (severity !== "Any") params.severity = severity;
      if (roadType !== "All") params.road_type = roadType;

      const [districtRes, heatRes, listRes] = await Promise.allSettled([
        fetchZones(token, { type: "DISTRICT" }),
        fetchIradHotspots(token, params),
        fetchIradAccidents(token, params),
      ]);

      if (districtRes.status === "fulfilled") {
        setDistrictsGeo(districtRes.value.data?.geojson || null);
        setStateBoundary(districtRes.value.data?.state_boundary || null);
      }
      if (heatRes.status === "fulfilled") setHeatPoints((heatRes.value.data?.heat_points || []) as HeatPoint[]);
      if (listRes.status === "fulfilled") setAccidents((listRes.value.data || []) as AccidentRow[]);
    };

    load();
  }, [token, dateDays, severity, roadType]);

  const fatalCount = useMemo(
    () => accidents.filter((row) => String(row.severity || "").toLowerCase().includes("fatal")).length,
    [accidents]
  );

  const topDistricts = useMemo(() => {
    const counts = accidents.reduce<Record<string, number>>((acc, row) => {
      const district = row.district || "Unknown";
      acc[district] = (acc[district] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [accidents]);

  const maxTop = Math.max(...topDistricts.map((item) => item.value), 1);

  const districtCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const row of accidents) {
      const key = (row.district || "").toLowerCase().trim();
      if (key) counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [accidents]);
  const dateLabel = DATE_OPTIONS.find((o) => o.days === dateDays)?.label || "Custom";

  return (
    <div className="relative h-[calc(100vh-9.25rem)] min-h-[780px] overflow-hidden rounded-[28px] border bg-[var(--bg-surface)]">
      <AccidentMap
        heatPoints={heatPoints}
        districts={districtsGeo}
        stateBoundary={stateBoundary}
        districtCounts={districtCounts}
      />

      {/* Filter bar */}
      <div className="absolute left-4 right-4 top-4 flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 rounded-[18px] border bg-[var(--bg-surface)]/95 p-1.5 shadow-[var(--shadow-sm)] backdrop-blur">

          {/* Severity filter */}
          <div className="relative">
            <button
              onClick={() => { setShowSevMenu((v) => !v); setShowDateMenu(false); setShowRoadMenu(false); }}
              className={`inline-flex h-10 items-center gap-2 rounded-[14px] px-3 text-sm transition ${severity !== "Any" ? "bg-[var(--accent-50)] text-[var(--accent-700)]" : "text-[var(--fg-primary)]"}`}
            >
              <Filter className="h-4 w-4 text-[var(--fg-tertiary)]" />
              {severity === "Any" ? "Severity: any" : `Severity: ${severity}`}
            </button>
            {showSevMenu && (
              <div className="absolute top-12 left-0 z-20 rounded-[16px] border bg-[var(--bg-surface)] p-1 shadow-lg">
                {SEVERITY_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { setSeverity(opt); setShowSevMenu(false); }}
                    className={`block w-full rounded-[12px] px-4 py-2 text-left text-sm font-medium hover:bg-[var(--bg-subtle)] ${severity === opt ? "text-[var(--accent-700)]" : "text-[var(--fg-primary)]"}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="hidden h-5 w-px bg-[var(--border-default)] sm:block" />

          {/* Road type filter */}
          <div className="relative">
            <button
              onClick={() => { setShowRoadMenu((v) => !v); setShowDateMenu(false); setShowSevMenu(false); }}
              className={`inline-flex h-10 items-center gap-2 rounded-[14px] px-3 text-sm transition ${roadType !== "All" ? "bg-[var(--accent-50)] text-[var(--accent-700)]" : "text-[var(--fg-primary)]"}`}
            >
              <TrafficCone className="h-4 w-4 text-[var(--fg-tertiary)]" />
              {roadType === "All" ? "Road type: all" : `Road: ${roadType}`}
            </button>
            {showRoadMenu && (
              <div className="absolute top-12 left-0 z-20 rounded-[16px] border bg-[var(--bg-surface)] p-1 shadow-lg">
                {ROAD_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { setRoadType(opt); setShowRoadMenu(false); }}
                    className={`block w-full rounded-[12px] px-4 py-2 text-left text-sm font-medium hover:bg-[var(--bg-subtle)] ${roadType === opt ? "text-[var(--accent-700)]" : "text-[var(--fg-primary)]"}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="hidden h-5 w-px bg-[var(--border-default)] sm:block" />

          {/* Date filter */}
          <div className="relative">
            <button
              onClick={() => { setShowDateMenu((v) => !v); setShowSevMenu(false); setShowRoadMenu(false); }}
              className="inline-flex h-10 items-center gap-2 rounded-[14px] px-3 text-sm text-[var(--fg-primary)]"
            >
              <Calendar className="h-4 w-4 text-[var(--fg-tertiary)]" />
              {dateLabel}
            </button>
            {showDateMenu && (
              <div className="absolute top-12 left-0 z-20 rounded-[16px] border bg-[var(--bg-surface)] p-1 shadow-lg">
                {DATE_OPTIONS.map((opt) => (
                  <button
                    key={opt.days}
                    onClick={() => { setDateDays(opt.days); setShowDateMenu(false); }}
                    className={`block w-full rounded-[12px] px-4 py-2 text-left text-sm font-medium hover:bg-[var(--bg-subtle)] ${dateDays === opt.days ? "text-[var(--accent-700)]" : "text-[var(--fg-primary)]"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <aside className="absolute bottom-4 right-4 top-4 w-[320px] overflow-y-auto rounded-[24px] border bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-md)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--fg-tertiary)]">
          IRAD · Road safety
        </p>
        <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.01em] text-[var(--fg-primary)]">
          Accident hotspots
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-[18px] bg-[var(--bg-subtle)] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--fg-tertiary)]">
              Total ({dateDays}d)
            </p>
            <p className="text-[22px] font-bold tabular-nums text-[var(--fg-primary)]">
              {accidents.length}
            </p>
          </div>
          <div className="rounded-[18px] bg-[var(--bg-subtle)] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--fg-tertiary)]">
              Fatal
            </p>
            <p className="text-[22px] font-bold tabular-nums text-[var(--risk-high)]">
              {fatalCount}
            </p>
          </div>
        </div>

        <p className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--fg-tertiary)]">
          Top 5 districts
        </p>
        <div className="space-y-2">
          {topDistricts.length ? topDistricts.map((district, index) => (
            <div key={district.name} className="grid grid-cols-[1fr_30px] items-center gap-2 text-[12px]">
              <div>
                <p className="truncate text-[var(--fg-primary)]">{district.name}</p>
                <span className="mt-1 block h-1 overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                  <span
                    className={`block h-full rounded-full ${index < 2 ? "bg-[var(--risk-high)]" : index < 4 ? "bg-[var(--risk-medium)]" : "bg-[var(--accent-500)]"}`}
                    style={{ width: `${(district.value / maxTop) * 100}%` }}
                  />
                </span>
              </div>
              <span className="text-right font-semibold tabular-nums text-[var(--fg-primary)]">
                {district.value}
              </span>
            </div>
          )) : (
            <p className="text-sm text-[var(--fg-tertiary)]">No accident data for selected filters.</p>
          )}
        </div>
      </aside>
    </div>
  );
}
