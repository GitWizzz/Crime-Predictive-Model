"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { GeoJsonObject } from "geojson";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Activity,
  AlertTriangle,
  ChevronRight,
  Flame,
  Layers3,
  MapPinned,
  RefreshCcw,
  ShieldAlert,
  Siren,
} from "lucide-react";
import { fetchFIRs, fetchHotspots, fetchKDEHotspots } from "@/services/hotspots";
import { fetchZones } from "@/services/zones";
import { fetchZoneAnalytics, fetchWomenSafety } from "@/services/analytics";
import { fetchIradHotspots } from "@/services/irad";

const HotspotsMap = dynamic(() => import("@/components/map/HotspotsMap"), { ssr: false });

const MODE_DBSCAN = "dbscan" as const;
const MODE_KDE = "kde" as const;
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

type Hotspot = {
  clusterId: string;
  centroid: { type: "Point"; coordinates: [number, number] };
  boundary: unknown;
  crimeCount: number;
  crimeDistribution: Record<string, number>;
};

type HeatPoint = {
  lat: number;
  lon: number;
  intensity: number;
};

type FIRIncident = {
  id: number;
  latitude: number;
  longitude: number;
  date_time?: string;
  crime_type?: string;
};

type ZoneTotal = {
  name: string;
  crime_count: number;
  district_name?: string | null;
};

type ZoneAnalyticsRow = {
  name: string;
  dominant_crime_type?: string;
  dominant_category?: string;
};

const fmt = (value: number) => new Intl.NumberFormat("en-IN").format(value);

const DistrictChart = ({
  totals,
  topN,
  onTopNChange,
}: {
  totals: ZoneTotal[];
  topN: number;
  onTopNChange: (value: number) => void;
}) => {
  const data = [...totals].sort((a, b) => b.crime_count - a.crime_count).slice(0, topN);

  if (!data.length) {
    return <div className="mt-2 text-sm text-[var(--fg-tertiary)]">No data yet.</div>;
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2 text-xs text-[var(--fg-tertiary)]">
        <span>Top N</span>
        <select
          className="rounded-xl border bg-[var(--bg-surface)] px-3 py-1.5 text-xs"
          value={topN}
          onChange={(event) => onTopNChange(Number(event.target.value))}
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={12}>12</option>
          <option value={20}>20</option>
        </select>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-18} dy={12} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="crime_count" fill="#3b6eff" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const StationChart = ({
  totals,
  topN,
  onTopNChange,
}: {
  totals: ZoneTotal[];
  topN: number;
  onTopNChange: (value: number) => void;
}) => {
  const data = [...totals].sort((a, b) => b.crime_count - a.crime_count).slice(0, topN);

  if (!data.length) {
    return <div className="mt-2 text-sm text-[var(--fg-tertiary)]">No data yet.</div>;
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2 text-xs text-[var(--fg-tertiary)]">
        <span>Top N</span>
        <select
          className="rounded-xl border bg-[var(--bg-surface)] px-3 py-1.5 text-xs"
          value={topN}
          onChange={(event) => onTopNChange(Number(event.target.value))}
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={12}>12</option>
          <option value={20}>20</option>
        </select>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-18} dy={12} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="crime_count" fill="#f59e0b" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default function HotspotsPage() {
  const [mode, setMode] = useState<typeof MODE_DBSCAN | typeof MODE_KDE>(MODE_DBSCAN);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [heatPoints, setHeatPoints] = useState<HeatPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token] = useState<string | null>(() =>
    typeof window !== "undefined" ? window.localStorage.getItem("authToken") : null
  );
  const [districtsGeo, setDistrictsGeo] = useState<GeoJsonObject | null>(null);
  const [stateBoundary, setStateBoundary] = useState<GeoJsonObject | null>(null);
  const [stationsGeo, setStationsGeo] = useState<GeoJsonObject | null>(null);
  const [districtTotals, setDistrictTotals] = useState<ZoneTotal[]>([]);
  const [stationTotals, setStationTotals] = useState<ZoneTotal[]>([]);
  const [chartDistrictTotals, setChartDistrictTotals] = useState<ZoneTotal[]>([]);
  const [chartStationTotals, setChartStationTotals] = useState<ZoneTotal[]>([]);
  const [districtAnalytics, setDistrictAnalytics] = useState<ZoneAnalyticsRow[]>([]);
  const [stationAnalytics, setStationAnalytics] = useState<ZoneAnalyticsRow[]>([]);
  const [topN, setTopN] = useState(12);
  const [stationTopN, setStationTopN] = useState(12);
  const [stationDistrictFilter, setStationDistrictFilter] = useState("All");
  const [zoneFilters, setZoneFilters] = useState({ startDate: "", endDate: "" });
  const [chartFilters, setChartFilters] = useState({ startDate: "", endDate: "" });
  const [showWomenSafety, setShowWomenSafety] = useState(false);
  const [showAccidents, setShowAccidents] = useState(false);
  const [womenHeatPoints, setWomenHeatPoints] = useState<HeatPoint[]>([]);
  const [accidentHeatPoints, setAccidentHeatPoints] = useState<HeatPoint[]>([]);
  const [showDistrictShading, setShowDistrictShading] = useState(true);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const loadZones = useCallback(async () => {
    if (!token) return;
    try {
      const zoneParams: Record<string, string> = { type: "DISTRICT" };
      if (zoneFilters.startDate) zoneParams.startDate = zoneFilters.startDate;
      if (zoneFilters.endDate) zoneParams.endDate = zoneFilters.endDate;

      const chartParams: Record<string, string> = { type: "DISTRICT" };
      if (chartFilters.startDate) chartParams.startDate = chartFilters.startDate;
      if (chartFilters.endDate) chartParams.endDate = chartFilters.endDate;

      const [
        districtRes,
        stationRes,
        chartDistrictRes,
        chartStationRes,
        districtAnalyticRes,
        stationAnalyticRes,
      ] = await Promise.all([
        fetchZones(token, zoneParams),
        fetchZones(token, { ...zoneParams, type: "STATION" }),
        fetchZones(token, chartParams),
        fetchZones(token, { ...chartParams, type: "STATION" }),
        fetchZoneAnalytics(token, zoneParams),
        fetchZoneAnalytics(token, { ...zoneParams, type: "STATION" }),
      ]);

      setDistrictsGeo(districtRes.data?.geojson || null);
      setStateBoundary(districtRes.data?.state_boundary || null);
      setDistrictTotals(districtRes.data?.totals || []);
      setStationsGeo(stationRes.data?.geojson || null);
      setStationTotals(stationRes.data?.totals || []);
      setChartDistrictTotals(chartDistrictRes.data?.totals || []);
      setChartStationTotals(chartStationRes.data?.totals || []);
      setDistrictAnalytics(districtAnalyticRes.data || []);
      setStationAnalytics(stationAnalyticRes.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load zone boundaries.");
    }
  }, [token, zoneFilters, chartFilters]);

  useEffect(() => {
    loadZones();
  }, [loadZones]);

  const stationDistrictOptions = Array.from(
    new Set(
      stationTotals
        .map((row) => row.district_name)
        .filter((value): value is string => Boolean(value))
    )
  ).sort();

  const filteredChartStationTotals = chartStationTotals.filter((row) =>
    stationDistrictFilter === "All" ? true : row.district_name === stationDistrictFilter
  );

  const groupedStationTotals = stationTotals.reduce<Record<string, ZoneTotal[]>>((acc, row) => {
    const district = row.district_name || "Unknown District";
    if (stationDistrictFilter !== "All" && district !== stationDistrictFilter) {
      return acc;
    }
    if (!acc[district]) acc[district] = [];
    acc[district].push(row);
    return acc;
  }, {});

  const districtAnalyticsMap = new Map(districtAnalytics.map((row) => [row.name, row]));
  const stationAnalyticsMap = new Map(stationAnalytics.map((row) => [row.name, row]));

  const loadDBSCAN = useCallback(async () => {
    const res = await fetchHotspots(token);
    const nextHotspots = res.data || [];
    setHotspots(nextHotspots);
    setHeatPoints([]);
    setSelectedHotspotId((current) =>
      current && nextHotspots.some((item: Hotspot) => item.clusterId === current)
        ? current
        : nextHotspots[0]?.clusterId || null
    );
  }, [token]);

  const loadKDE = useCallback(async () => {
    const firRes = await fetchFIRs(token);
    const firs = firRes.data?.items || [];
    if (!firs.length) {
      setHeatPoints([]);
      return;
    }

    const incidents = (firs as FIRIncident[]).map((fir) => ({
      id: fir.id,
      lat: fir.latitude,
      lon: fir.longitude,
      occurred_at: fir.date_time,
      crime_type: fir.crime_type,
    }));

    const kdeRes = await fetchKDEHotspots(token, {
      incidents,
      bandwidth_meters: 500,
      grid_size: 35,
    });

    setHeatPoints(kdeRes.data?.heat_points || []);
    setHotspots([]);
    setSelectedHotspotId(null);
  }, [token]);

  const loadData = useCallback(async () => {
    if (!token) {
      setError("Missing auth token. Set localStorage key authToken after login.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (mode === MODE_DBSCAN) {
        await loadDBSCAN();
      } else {
        await loadKDE();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load hotspots");
    } finally {
      setLoading(false);
    }
  }, [loadDBSCAN, loadKDE, mode, token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const loadWomen = async () => {
      if (!token || !showWomenSafety) {
        setWomenHeatPoints([]);
        return;
      }
      try {
        const params: Record<string, string> = {};
        if (zoneFilters.startDate) params.startDate = zoneFilters.startDate;
        if (zoneFilters.endDate) params.endDate = zoneFilters.endDate;
        const res = await fetchWomenSafety(token, params);
        setWomenHeatPoints(res.data?.heat_points || []);
      } catch {
        setWomenHeatPoints([]);
      }
    };
    loadWomen();
  }, [token, showWomenSafety, zoneFilters]);

  useEffect(() => {
    const loadAccidents = async () => {
      if (!token || !showAccidents) {
        setAccidentHeatPoints([]);
        return;
      }
      try {
        const params: Record<string, string> = {};
        if (zoneFilters.startDate) params.startDate = zoneFilters.startDate;
        if (zoneFilters.endDate) params.endDate = zoneFilters.endDate;
        const res = await fetchIradHotspots(token, params);
        setAccidentHeatPoints(res.data?.heat_points || []);
      } catch {
        setAccidentHeatPoints([]);
      }
    };
    loadAccidents();
  }, [token, showAccidents, zoneFilters]);

  useEffect(() => {
    if (!token) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const source = new EventSource(`${API_BASE}/api/events/stream?token=${token}`);
    eventSourceRef.current = source;

    source.addEventListener("fir_created", () => {
      loadData();
      loadZones();
    });
    source.addEventListener("fir_bulk_created", () => {
      loadData();
      loadZones();
    });
    source.onerror = () => {
      source.close();
    };

    return () => {
      source.close();
    };
  }, [token, loadData, loadZones]);

  const selectedHotspot =
    hotspots.find((hotspot) => hotspot.clusterId === selectedHotspotId) || hotspots[0] || null;
  const totalVisibleIncidents = hotspots.reduce((sum, hotspot) => sum + hotspot.crimeCount, 0);
  const dominantCrimeEntry = selectedHotspot
    ? Object.entries(selectedHotspot.crimeDistribution || {}).sort((a, b) => Number(b[1]) - Number(a[1]))[0]
    : null;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <section className="surface-card-strong rounded-[30px] p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--fg-tertiary)]">
              Spatial intelligence
            </p>
            <h2 className="mt-2 text-[30px] font-semibold tracking-[-0.03em] text-[var(--fg-primary)]">
              Hotspot command map
            </h2>
            <p className="mt-3 text-[15px] leading-7 text-[var(--fg-secondary)]">
              The previously implemented map still needed work. The district fill was too flat,
              the hotspot shapes looked approximate, and the visual hierarchy was not strong
              enough for an operational view. This version uses clearer risk layering, better
              district styling, and a more focused cluster inspection flow.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                mode === MODE_DBSCAN
                  ? "bg-[var(--accent-500)] text-white shadow-[var(--shadow-sm)]"
                  : "border bg-[var(--bg-surface)] text-[var(--fg-secondary)]"
              }`}
              onClick={() => setMode(MODE_DBSCAN)}
            >
              Cluster map
            </button>
            <button
              className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                mode === MODE_KDE
                  ? "bg-[var(--accent-500)] text-white shadow-[var(--shadow-sm)]"
                  : "border bg-[var(--bg-surface)] text-[var(--fg-secondary)]"
              }`}
              onClick={() => setMode(MODE_KDE)}
            >
              Heatmap
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-2xl border bg-[var(--bg-surface)] px-4 py-2 text-sm font-medium text-[var(--fg-secondary)]"
              onClick={loadData}
              disabled={loading}
            >
              <RefreshCcw className="h-4 w-4" />
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {[
            {
              label: "Women safety layer",
              active: showWomenSafety,
              onClick: () => setShowWomenSafety((value) => !value),
            },
            {
              label: "IRAD accident layer",
              active: showAccidents,
              onClick: () => setShowAccidents((value) => !value),
            },
            {
              label: "District shading",
              active: showDistrictShading,
              onClick: () => setShowDistrictShading((value) => !value),
            },
          ].map((item) => (
            <button
              key={item.label}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                item.active
                  ? "bg-[var(--accent-50)] text-[var(--accent-700)]"
                  : "border bg-[var(--bg-surface)] text-[var(--fg-secondary)]"
              }`}
              onClick={item.onClick}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {error ? (
        <div className="rounded-[22px] border border-[var(--risk-high)]/20 bg-[var(--risk-high-bg)] p-4 text-sm text-[var(--risk-high)]">
          {error}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.42fr]">
        <div className="space-y-4">
          <div className="surface-card rounded-[28px] p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--fg-secondary)]">
                <div className="inline-flex items-center gap-2 rounded-2xl border bg-[var(--bg-subtle)] px-3 py-2">
                  <MapPinned className="h-4 w-4 text-[var(--accent-500)]" />
                  Bihar state
                </div>
                <div className="inline-flex items-center gap-2 rounded-2xl border bg-[var(--bg-subtle)] px-3 py-2">
                  <Activity className="h-4 w-4 text-[var(--risk-high)]" />
                  {mode === MODE_DBSCAN ? "Clustered FIR density" : "Smoothed heat surface"}
                </div>
                <div className="inline-flex items-center gap-2 rounded-2xl border bg-[var(--bg-subtle)] px-3 py-2">
                  <Layers3 className="h-4 w-4 text-[var(--risk-medium)]" />
                  {zoneFilters.startDate || zoneFilters.endDate ? "Custom date range" : "All dates"}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--fg-secondary)]">
                <input
                  type="date"
                  value={zoneFilters.startDate}
                  onChange={(event) =>
                    setZoneFilters((prev) => ({ ...prev, startDate: event.target.value }))
                  }
                  className="rounded-2xl border bg-[var(--bg-surface)] px-3 py-2"
                />
                <input
                  type="date"
                  value={zoneFilters.endDate}
                  onChange={(event) =>
                    setZoneFilters((prev) => ({ ...prev, endDate: event.target.value }))
                  }
                  className="rounded-2xl border bg-[var(--bg-surface)] px-3 py-2"
                />
              </div>
            </div>

            <HotspotsMap
              mode={mode}
              hotspots={hotspots}
              heatPoints={heatPoints}
              womenHeatPoints={showWomenSafety ? womenHeatPoints : []}
              accidentHeatPoints={showAccidents ? accidentHeatPoints : []}
              districts={districtsGeo}
              stateBoundary={stateBoundary}
              stations={stationsGeo}
              showDistrictShading={showDistrictShading}
              selectedHotspotId={selectedHotspotId}
              onSelectHotspot={setSelectedHotspotId}
            />
          </div>
        </div>

        <aside className="space-y-4">
          <div className="surface-card rounded-[28px] p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--fg-primary)]">
              <ShieldAlert className="h-4 w-4 text-[var(--risk-high)]" />
              Selected cluster
            </div>
            {selectedHotspot ? (
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fg-tertiary)]">
                    Cluster ID
                  </p>
                  <p className="mt-1 text-xl font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">
                    {selectedHotspot.clusterId}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[22px] border bg-[var(--bg-subtle)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fg-tertiary)]">
                      Incidents
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--fg-primary)]">
                      {fmt(selectedHotspot.crimeCount)}
                    </p>
                  </div>
                  <div className="rounded-[22px] border bg-[var(--bg-subtle)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fg-tertiary)]">
                      Dominant type
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[var(--fg-primary)]">
                      {dominantCrimeEntry?.[0] || "Unavailable"}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fg-tertiary)]">
                    Crime mix
                  </p>
                  <div className="mt-3 space-y-3">
                    {Object.entries(selectedHotspot.crimeDistribution || {})
                      .sort((a, b) => Number(b[1]) - Number(a[1]))
                      .slice(0, 4)
                      .map(([crimeType, count]) => (
                        <div key={crimeType}>
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <span className="text-[var(--fg-secondary)]">{crimeType}</span>
                            <span className="font-semibold text-[var(--fg-primary)]">{count}</span>
                          </div>
                          <div className="h-2 rounded-full bg-[var(--bg-muted)]">
                            <div
                              className="h-full rounded-full bg-[var(--accent-500)]"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (Number(count) / Math.max(1, selectedHotspot.crimeCount)) * 100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-[var(--fg-secondary)]">
                Select a hotspot on the map to inspect cluster detail.
              </p>
            )}
          </div>

          <div className="surface-card rounded-[28px] p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--fg-primary)]">
              <Flame className="h-4 w-4 text-[var(--risk-medium)]" />
              Quick summary
            </div>
            <div className="mt-4 space-y-4 text-sm text-[var(--fg-secondary)]">
              <div className="rounded-[22px] border bg-[var(--bg-subtle)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fg-tertiary)]">
                  Visible incidents
                </p>
                <p className="mt-2 text-2xl font-semibold text-[var(--fg-primary)]">
                  {fmt(totalVisibleIncidents)}
                </p>
              </div>
              <div className="rounded-[22px] border bg-[var(--bg-subtle)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fg-tertiary)]">
                  Priority district
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--fg-primary)]">
                  {districtTotals.slice().sort((a, b) => b.crime_count - a.crime_count)[0]?.name || "N/A"}
                </p>
              </div>
              <div className="rounded-[22px] border bg-[var(--risk-high-bg)] p-4 text-[var(--risk-high)]">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <AlertTriangle className="h-4 w-4" />
                  Map review
                </div>
                <p className="mt-2 text-sm">
                  The older implementation was functional, but it still needed design changes.
                  The hotspot visualization and district choropleth were not yet strong enough for
                  a polished command-dashboard experience.
                </p>
              </div>
            </div>
          </div>

          <div className="surface-card rounded-[28px] p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--fg-primary)]">
              <Siren className="h-4 w-4 text-[var(--accent-500)]" />
              Suggested action
            </div>
            <p className="mt-4 text-sm leading-6 text-[var(--fg-secondary)]">
              Review the selected cluster, compare it with district totals below, and then use
              the patrol and FIR modules to convert map insight into field action.
            </p>
          </div>
        </aside>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="surface-card rounded-[28px] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fg-tertiary)]">
                District pattern
              </p>
              <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">
                District-wise crime chart
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--fg-tertiary)]">
              <input
                type="date"
                value={chartFilters.startDate}
                onChange={(event) =>
                  setChartFilters((prev) => ({ ...prev, startDate: event.target.value }))
                }
                className="rounded-xl border bg-[var(--bg-surface)] px-3 py-1.5"
              />
              <ChevronRight className="h-3.5 w-3.5" />
              <input
                type="date"
                value={chartFilters.endDate}
                onChange={(event) =>
                  setChartFilters((prev) => ({ ...prev, endDate: event.target.value }))
                }
                className="rounded-xl border bg-[var(--bg-surface)] px-3 py-1.5"
              />
            </div>
          </div>
          <DistrictChart totals={chartDistrictTotals} topN={topN} onTopNChange={setTopN} />
        </div>

        <div className="surface-card rounded-[28px] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fg-tertiary)]">
                Station pattern
              </p>
              <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">
                Station-wise crime chart
              </h3>
            </div>
            <select
              className="rounded-2xl border bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--fg-secondary)]"
              value={stationDistrictFilter}
              onChange={(event) => setStationDistrictFilter(event.target.value)}
            >
              <option value="All">All districts</option>
              {stationDistrictOptions.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          </div>
          <StationChart
            totals={filteredChartStationTotals}
            topN={stationTopN}
            onTopNChange={setStationTopN}
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="surface-card rounded-[28px] p-5">
          <h3 className="text-xl font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">
            Station-wise crime totals
          </h3>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-[var(--fg-tertiary)]">
                <tr>
                  <th className="px-3 py-3">District</th>
                  <th className="px-3 py-3">Station</th>
                  <th className="px-3 py-3">Crimes</th>
                  <th className="px-3 py-3">Dominant crime</th>
                  <th className="px-3 py-3">Category</th>
                </tr>
              </thead>
              <tbody>
                {stationTotals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-[var(--fg-tertiary)]">
                      No station totals yet.
                    </td>
                  </tr>
                ) : null}
                {Object.entries(groupedStationTotals).map(([district, rows]) =>
                  rows.map((row, index) => {
                    const analytic = stationAnalyticsMap.get(row.name) || {};
                    return (
                      <tr key={`${district}-${row.name}`} className="border-t">
                        <td className="px-3 py-3">{index === 0 ? district : ""}</td>
                        <td className="px-3 py-3">{row.name}</td>
                        <td className="px-3 py-3 font-semibold">{row.crime_count}</td>
                        <td className="px-3 py-3">{analytic.dominant_crime_type || "-"}</td>
                        <td className="px-3 py-3">{analytic.dominant_category || "-"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="surface-card rounded-[28px] p-5">
          <h3 className="text-xl font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">
            District-wise crime totals
          </h3>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-[var(--fg-tertiary)]">
                <tr>
                  <th className="px-3 py-3">District</th>
                  <th className="px-3 py-3">Crimes</th>
                  <th className="px-3 py-3">Dominant crime</th>
                  <th className="px-3 py-3">Category</th>
                </tr>
              </thead>
              <tbody>
                {districtTotals.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-[var(--fg-tertiary)]">
                      No district totals yet.
                    </td>
                  </tr>
                ) : null}
                {districtTotals.map((row) => {
                  const analytic = districtAnalyticsMap.get(row.name) || {};
                  return (
                    <tr key={row.name} className="border-t">
                      <td className="px-3 py-3">{row.name}</td>
                      <td className="px-3 py-3 font-semibold">{row.crime_count}</td>
                      <td className="px-3 py-3">{analytic.dominant_crime_type || "-"}</td>
                      <td className="px-3 py-3">{analytic.dominant_category || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
