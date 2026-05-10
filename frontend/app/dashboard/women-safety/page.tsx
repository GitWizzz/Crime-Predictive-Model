"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { GeoJsonObject } from "geojson";
import { Calendar, Info } from "lucide-react";
import { fetchWomenSafety, fetchWomenSafetyFIRs } from "@/services/analytics";
import { fetchZones } from "@/services/zones";

const HotspotsMap = dynamic(() => import("@/components/map/HotspotsMap"), { ssr: false });

type HeatPoint = { lat: number; lon: number; intensity: number };
type FIRRow = { id: number; zone?: string | null; district?: string | null; crime_type?: string };

const DATE_OPTIONS = [
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "Last 6 months", days: 180 },
];

export default function WomenSafetyPage() {
  const [token] = useState<string | null>(() =>
    typeof window !== "undefined" ? window.localStorage.getItem("authToken") : null
  );
  const [districtsGeo, setDistrictsGeo] = useState<GeoJsonObject | null>(null);
  const [stateBoundary, setStateBoundary] = useState<GeoJsonObject | null>(null);
  const [womenHeatPoints, setWomenHeatPoints] = useState<HeatPoint[]>([]);
  const [firs, setFirs] = useState<FIRRow[]>([]);
  const [dateDays, setDateDays] = useState(90);
  const [showDateMenu, setShowDateMenu] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      const startDate = new Date(Date.now() - dateDays * 86400_000).toISOString().slice(0, 10);

      const [womenRes, firsRes, districtRes] = await Promise.allSettled([
        fetchWomenSafety(token, { startDate }),
        fetchWomenSafetyFIRs(token, { startDate, limit: "500" }),
        fetchZones(token, { type: "DISTRICT" }),
      ]);

      if (womenRes.status === "fulfilled") setWomenHeatPoints((womenRes.value.data?.heat_points || []) as HeatPoint[]);
      if (firsRes.status === "fulfilled") setFirs((firsRes.value.data?.items || firsRes.value.data || []) as FIRRow[]);
      if (districtRes.status === "fulfilled") {
        setDistrictsGeo(districtRes.value.data?.geojson || null);
        setStateBoundary(districtRes.value.data?.state_boundary || null);
      }
    };

    load();
  }, [token, dateDays]);

  const totalIncidents = firs.length || womenHeatPoints.reduce(
    (sum, point) => sum + Math.max(1, Math.round((point.intensity || 0) * 3)),
    0
  );

  const topZones = useMemo(() => {
    if (firs.length) {
      const counts = firs.reduce<Record<string, number>>((acc, row) => {
        const key = row.zone || row.district || "Unknown";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, value]) => ({ name, value }));
    }
    return [];
  }, [firs]);

  const maxZone = Math.max(...topZones.map((z) => z.value), 1);
  const dateLabel = DATE_OPTIONS.find((o) => o.days === dateDays)?.label || "Custom";

  return (
    <div className="mx-auto max-w-[1440px] space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">
            Women safety
          </h1>
          <p className="mt-1 text-[13px] text-[var(--fg-secondary)]">
            KDE weighted on IPC sections relevant to women safety
          </p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowDateMenu((v) => !v)}
            className="inline-flex h-10 items-center gap-2 rounded-[14px] border bg-[var(--bg-surface)] px-4 text-sm font-medium text-[var(--fg-primary)]"
          >
            <Calendar className="h-4 w-4" />
            {dateLabel}
          </button>
          {showDateMenu && (
            <div className="absolute right-0 top-12 z-20 rounded-[16px] border bg-[var(--bg-surface)] p-1 shadow-lg">
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
              Density map · {dateLabel.toLowerCase()}
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
            <p className="mt-1 text-[13px] text-[var(--fg-secondary)]">{dateLabel}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-[18px] bg-[var(--bg-subtle)] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--fg-tertiary)]">
                  FIRs
                </p>
                <p className="mt-1 text-[24px] font-bold tabular-nums text-[var(--fg-primary)]">
                  {totalIncidents}
                </p>
              </div>
              <div className="rounded-[18px] bg-[var(--bg-subtle)] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--fg-tertiary)]">
                  Hotspot zones
                </p>
                <p className="mt-1 text-[24px] font-bold tabular-nums text-[var(--risk-high)]">
                  {womenHeatPoints.length}
                </p>
              </div>
            </div>
          </section>

          <section className="surface-card rounded-[26px] p-5">
            <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">
              Top zones
            </h2>
            <div className="mt-4 space-y-3">
              {topZones.length ? (
                topZones.map((zone, index) => (
                  <div key={zone.name} className="grid grid-cols-[1fr_72px_34px] items-center gap-3 text-[12.5px]">
                    <span className="truncate text-[var(--fg-secondary)]">{zone.name}</span>
                    <span className="h-2 overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                      <span
                        className={`block h-full rounded-full ${
                          index < 2 ? "bg-[var(--risk-high)]" : index < 4 ? "bg-[var(--risk-medium)]" : "bg-[var(--accent-500)]"
                        }`}
                        style={{ width: `${(zone.value / maxZone) * 100}%` }}
                      />
                    </span>
                    <span className="text-right font-medium tabular-nums text-[var(--fg-primary)]">
                      {zone.value}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--fg-secondary)]">No data for selected period.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
