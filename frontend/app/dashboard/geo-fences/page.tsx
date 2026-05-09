"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { GeoJsonObject } from "geojson";
import { Plus } from "lucide-react";
import { fetchZones } from "@/services/zones";

const HotspotsMap = dynamic(() => import("@/components/map/HotspotsMap"), { ssr: false });

const fences = [
  {
    name: "School zones · Patna Sadar",
    triggers: "theft, assault, harassment",
    area: "12.4 km²",
    alerts: 7,
    enabled: true,
  },
  {
    name: "Railway perimeter",
    triggers: "theft, vehicle theft",
    area: "4.8 km²",
    alerts: 3,
    enabled: true,
  },
  {
    name: "Diwali night corridor",
    triggers: "all",
    area: "8.2 km²",
    alerts: 0,
    enabled: false,
  },
  {
    name: "Court & block office",
    triggers: "assault, harassment",
    area: "1.6 km²",
    alerts: 1,
    enabled: true,
  },
];

export default function GeoFencesPage() {
  const [token] = useState<string | null>(() =>
    typeof window !== "undefined" ? window.localStorage.getItem("authToken") : null
  );
  const [districtsGeo, setDistrictsGeo] = useState<GeoJsonObject | null>(null);
  const [stateBoundary, setStateBoundary] = useState<GeoJsonObject | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      const res = await fetchZones(token, { type: "DISTRICT" });
      setDistrictsGeo(res.data?.geojson || null);
      setStateBoundary(res.data?.state_boundary || null);
    };
    load();
  }, [token]);

  return (
    <div className="mx-auto max-w-[1440px] space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">
            Geo-fences
          </h1>
          <p className="mt-1 text-[13px] text-[var(--fg-secondary)]">
            Polygon boundaries that broadcast alerts when matching FIRs land inside
          </p>
        </div>
        <button className="inline-flex h-10 items-center gap-2 rounded-[14px] bg-[var(--accent-500)] px-4 text-sm font-semibold text-white">
          <Plus className="h-4 w-4" />
          Create fence
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="space-y-3">
          {fences.map((fence) => (
            <div
              key={fence.name}
              className="rounded-[24px] border bg-[var(--bg-surface)] p-4 transition hover:border-[var(--border-strong)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold tracking-[-0.01em] text-[var(--fg-primary)]">
                    {fence.name}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-[var(--fg-tertiary)]">
                    Triggers: {fence.triggers}
                  </p>
                </div>
                <span
                  className={`relative h-5 w-9 rounded-full transition-colors ${
                    fence.enabled ? "bg-[var(--accent-500)]" : "bg-[var(--bg-muted)]"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-[var(--shadow-xs)] transition-transform ${
                      fence.enabled ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-[12px]">
                <div>
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--fg-tertiary)]">
                    Area
                  </p>
                  <p className="mt-0.5 font-semibold tabular-nums text-[var(--fg-primary)]">
                    {fence.area}
                  </p>
                </div>
                <div>
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--fg-tertiary)]">
                    Alerts (7d)
                  </p>
                  <p className="mt-0.5 font-semibold tabular-nums text-[var(--fg-primary)]">
                    {fence.alerts}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <section className="surface-card rounded-[26px] p-5">
          <div>
            <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">
              Bihar · all fences
            </h2>
            <p className="mt-1 text-[13px] text-[var(--fg-secondary)]">
              Click any polygon to edit
            </p>
          </div>

          <div className="relative mt-4 h-[520px] overflow-hidden rounded-[20px] border">
            <HotspotsMap
              mode="dbscan"
              hotspots={[]}
              heatPoints={[]}
              districts={districtsGeo}
              stateBoundary={stateBoundary}
              showDistrictShading
            />
            <svg viewBox="200 80 520 300" className="pointer-events-none absolute inset-0 h-full w-full">
              <path
                d="M410,210 L450,200 L470,225 L455,255 L420,250 Z"
                fill="rgba(59,110,255,0.15)"
                stroke="#3B6EFF"
                strokeWidth="1.5"
              />
              <path
                d="M555,180 L600,180 L605,215 L560,220 Z"
                fill="rgba(217,119,6,0.15)"
                stroke="#D97706"
                strokeWidth="1.5"
              />
              <path
                d="M360,310 L400,305 L410,330 L375,340 Z"
                fill="rgba(220,38,38,0.15)"
                stroke="#DC2626"
                strokeWidth="1.5"
              />
            </svg>
          </div>
        </section>
      </div>
    </div>
  );
}
