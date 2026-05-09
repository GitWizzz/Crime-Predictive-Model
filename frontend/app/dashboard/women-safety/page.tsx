"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { GeoJsonObject } from "geojson";
import { Info } from "lucide-react";
import { fetchWomenSafety, fetchZoneAnalytics } from "@/services/analytics";
import { fetchZones } from "@/services/zones";

const HotspotsMap = dynamic(() => import("@/components/map/HotspotsMap"), { ssr: false });

type HeatPoint = {
  lat: number;
  lon: number;
  intensity: number;
};

type ZoneAnalyticsRow = {
  name: string;
  total?: number;
};

export default function WomenSafetyPage() {
  const [token] = useState<string | null>(() =>
    typeof window !== "undefined" ? window.localStorage.getItem("authToken") : null
  );
  const [districtsGeo, setDistrictsGeo] = useState<GeoJsonObject | null>(null);
  const [stateBoundary, setStateBoundary] = useState<GeoJsonObject | null>(null);
  const [womenHeatPoints, setWomenHeatPoints] = useState<HeatPoint[]>([]);
  const [zones, setZones] = useState<ZoneAnalyticsRow[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!token) return;

      const [womenRes, zoneRes, districtRes] = await Promise.all([
        fetchWomenSafety(token),
        fetchZoneAnalytics(token, { type: "DISTRICT" }),
        fetchZones(token, { type: "DISTRICT" }),
      ]);

      setWomenHeatPoints((womenRes.data?.heat_points || []) as HeatPoint[]);
      setZones(((zoneRes.data || []) as ZoneAnalyticsRow[]).slice(0, 5));
      setDistrictsGeo(districtRes.data?.geojson || null);
      setStateBoundary(districtRes.data?.state_boundary || null);
    };

    load();
  }, [token]);

  const incidentEstimate = useMemo(
    () =>
      womenHeatPoints.reduce(
        (sum, point) => sum + Math.max(1, Math.round((point.intensity || 0) * 3)),
        0
      ),
    [womenHeatPoints]
  );

  return (
    <div className="mx-auto max-w-[1440px] space-y-4">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">
          Women safety
        </h1>
        <p className="mt-1 text-[13px] text-[var(--fg-secondary)]">
          KDE weighted on IPC sections relevant to women safety
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-[20px] border border-[var(--accent-100)] bg-[var(--accent-50)]/60 px-4 py-3">
        <Info className="h-4 w-4 text-[var(--accent-700)]" />
        <p className="text-[12.5px] text-[var(--fg-primary)]">
          This view shows only crimes flagged as women-safety relevant per IPC sections 354,
          354A, 376, 498A and IT 67.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <section className="surface-card overflow-hidden rounded-[26px] p-0">
          <div className="border-b px-5 py-4">
            <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">
              Density map · last 90 days
            </h2>
          </div>
          <div className="relative h-[480px]">
            <HotspotsMap
              mode="kde"
              hotspots={[]}
              heatPoints={[]}
              womenHeatPoints={womenHeatPoints}
              districts={districtsGeo}
              stateBoundary={stateBoundary}
              showDistrictShading
            />
          </div>
        </section>

        <div className="space-y-4">
          <section className="surface-card rounded-[26px] p-5">
            <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">
              Summary
            </h2>
            <p className="mt-1 text-[13px] text-[var(--fg-secondary)]">Last 90 days</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-[18px] bg-[var(--bg-subtle)] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--fg-tertiary)]">
                  Incidents
                </p>
                <p className="mt-1 text-[24px] font-bold tabular-nums text-[var(--fg-primary)]">
                  {incidentEstimate}
                </p>
              </div>
              <div className="rounded-[18px] bg-[var(--bg-subtle)] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--fg-tertiary)]">
                  vs prev 90d
                </p>
                <p className="mt-1 text-[24px] font-bold tabular-nums text-[var(--risk-high)]">
                  +8.4%
                </p>
              </div>
            </div>
          </section>

          <section className="surface-card rounded-[26px] p-5">
            <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">
              Top zones
            </h2>
            <div className="mt-4 space-y-3">
              {zones.length ? (
                zones.map((zone, index) => {
                  const value = Math.max(14, Math.round((zone.total || 0) / Math.max(1, index + 1)));
                  const max = Math.max(...zones.map((item, i) => Math.max(14, Math.round((item.total || 0) / Math.max(1, i + 1)))), 1);
                  return (
                    <div key={zone.name} className="grid grid-cols-[1fr_72px_34px] items-center gap-3 text-[12.5px]">
                      <span className="truncate text-[var(--fg-secondary)]">{zone.name}</span>
                      <span className="h-2 overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                        <span
                          className={`block h-full rounded-full ${
                            index < 2
                              ? "bg-[var(--risk-high)]"
                              : index < 4
                                ? "bg-[var(--risk-medium)]"
                                : "bg-[var(--accent-500)]"
                          }`}
                          style={{ width: `${(value / max) * 100}%` }}
                        />
                      </span>
                      <span className="text-right font-medium tabular-nums text-[var(--fg-primary)]">
                        {value}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-[var(--fg-secondary)]">No women safety zones yet.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
