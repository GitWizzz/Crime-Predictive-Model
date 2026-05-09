"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { GeoJsonObject } from "geojson";
import { Calendar, Filter, TrafficCone } from "lucide-react";
import { fetchZones } from "@/services/zones";
import { fetchIradAccidents, fetchIradHotspots } from "@/services/irad";

const HotspotsMap = dynamic(() => import("@/components/map/HotspotsMap"), { ssr: false });

type HeatPoint = {
  lat: number;
  lon: number;
  intensity: number;
};

type AccidentRow = {
  id: number;
  district?: string | null;
  severity?: string | null;
};

export default function IradPage() {
  const [token] = useState<string | null>(() =>
    typeof window !== "undefined" ? window.localStorage.getItem("authToken") : null
  );
  const [districtsGeo, setDistrictsGeo] = useState<GeoJsonObject | null>(null);
  const [stateBoundary, setStateBoundary] = useState<GeoJsonObject | null>(null);
  const [heatPoints, setHeatPoints] = useState<HeatPoint[]>([]);
  const [accidents, setAccidents] = useState<AccidentRow[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!token) return;

      const [districtRes, heatRes, listRes] = await Promise.all([
        fetchZones(token, { type: "DISTRICT" }),
        fetchIradHotspots(token),
        fetchIradAccidents(token),
      ]);

      setDistrictsGeo(districtRes.data?.geojson || null);
      setStateBoundary(districtRes.data?.state_boundary || null);
      setHeatPoints((heatRes.data?.heat_points || []) as HeatPoint[]);
      setAccidents((listRes.data || []) as AccidentRow[]);
    };

    load();
  }, [token]);

  const fatalCount = useMemo(
    () =>
      accidents.filter((row) =>
        String(row.severity || "")
          .toLowerCase()
          .includes("fatal")
      ).length,
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

  return (
    <div className="relative h-[calc(100vh-9.25rem)] min-h-[780px] overflow-hidden rounded-[28px] border bg-[var(--bg-surface)]">
      <HotspotsMap
        mode="kde"
        hotspots={[]}
        heatPoints={[]}
        accidentHeatPoints={heatPoints}
        districts={districtsGeo}
        stateBoundary={stateBoundary}
        showDistrictShading
      />

      <div className="absolute left-4 right-4 top-4 flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 rounded-[18px] border bg-[var(--bg-surface)]/95 p-1.5 shadow-[var(--shadow-sm)] backdrop-blur">
          <button className="inline-flex h-10 items-center gap-2 rounded-[14px] px-3 text-sm text-[var(--fg-primary)]">
            <Filter className="h-4 w-4 text-[var(--fg-tertiary)]" />
            Severity: any
          </button>
          <span className="hidden h-5 w-px bg-[var(--border-default)] sm:block" />
          <button className="inline-flex h-10 items-center gap-2 rounded-[14px] px-3 text-sm text-[var(--fg-primary)]">
            <TrafficCone className="h-4 w-4 text-[var(--fg-tertiary)]" />
            Road type: all
          </button>
          <span className="hidden h-5 w-px bg-[var(--border-default)] sm:block" />
          <button className="inline-flex h-10 items-center gap-2 rounded-[14px] px-3 text-sm text-[var(--fg-primary)]">
            <Calendar className="h-4 w-4 text-[var(--fg-tertiary)]" />
            Last 90 days
          </button>
        </div>
      </div>

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
              Total (90d)
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
          Top 5 stretches
        </p>
        <div className="space-y-2">
          {topDistricts.map((district, index) => (
            <div
              key={district.name}
              className="grid grid-cols-[1fr_30px] items-center gap-2 text-[12px]"
            >
              <div>
                <p className="truncate text-[var(--fg-primary)]">{district.name}</p>
                <span className="mt-1 block h-1 overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                  <span
                    className={`block h-full rounded-full ${
                      index < 2
                        ? "bg-[var(--risk-high)]"
                        : index < 4
                          ? "bg-[var(--risk-medium)]"
                          : "bg-[var(--accent-500)]"
                    }`}
                    style={{ width: `${(district.value / maxTop) * 100}%` }}
                  />
                </span>
              </div>
              <span className="text-right font-semibold tabular-nums text-[var(--fg-primary)]">
                {district.value}
              </span>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
