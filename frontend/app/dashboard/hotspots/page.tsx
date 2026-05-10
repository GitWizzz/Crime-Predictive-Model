"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { GeoJsonObject } from "geojson";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Activity,
  ChevronRight,
  Flame,
  Layers3,
  MapPinned,
  Maximize2,
  Minimize2,
  RefreshCcw,
  Siren,
  X,
} from "lucide-react";
import { fetchFIRs, fetchHotspots, fetchKDEHotspots } from "@/services/hotspots";
import { fetchZones } from "@/services/zones";
import { fetchZoneAnalytics, fetchWomenSafety } from "@/services/analytics";
import { fetchIradHotspots } from "@/services/irad";
import Drawer from "@/components/ui/Drawer";
import HotspotDetail from "@/components/dashboard/HotspotDetail";

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

const fmt = (value?: number) => new Intl.NumberFormat("en-IN").format(value ?? 0);

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
  const [firPins, setFirPins] = useState<{ id: number; lat: number; lon: number; crimeType: string; location?: string }[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const downloadCsv = (filename: string, rows: Array<Record<string, string | number | null | undefined>>) => {
    const headers = rows.length ? Object.keys(rows[0]) : [];
    const escape = (value: string | number | null | undefined) => {
      if (value === null || value === undefined) return "";
      const text = String(value).replace(/"/g, '""');
      return `"${text}"`;
    };
    const csv = [
      headers.join(","),
      ...rows.map((row) => headers.map((header) => escape(row[header])).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

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

  useEffect(() => {
    if (!token) return;
    fetchFIRs(token)
      .then((res) => {
        const items = (res.data?.items || []) as FIRIncident[];
        setFirPins(
          items
            .filter((f) => Number.isFinite(f.latitude) && Number.isFinite(f.longitude))
            .map((f) => ({
              id: f.id,
              lat: f.latitude,
              lon: f.longitude,
              crimeType: f.crime_type || "Unknown",
              dateTime: f.date_time,
            }))
        );
      })
      .catch(() => {});
  }, [token]);

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
  const sortedDistrictTotals = [...districtTotals].sort((a, b) => b.crime_count - a.crime_count);
  const stationTotalsSorted = [...stationTotals].sort((a, b) => b.crime_count - a.crime_count);
  const topDistrictPreview = sortedDistrictTotals.slice(0, 6);
  const topStationPreview = stationTotalsSorted.slice(0, 6);
  const stationCsvRows = stationTotalsSorted.map((row) => ({
    district: row.district_name || "",
    station: row.name,
    crimes: row.crime_count,
    dominant_crime: stationAnalyticsMap.get(row.name)?.dominant_crime_type || "",
    category: stationAnalyticsMap.get(row.name)?.dominant_category || "",
  }));
  const districtCsvRows = sortedDistrictTotals.map((row) => ({
    district: row.name,
    crimes: row.crime_count,
    dominant_crime: districtAnalyticsMap.get(row.name)?.dominant_crime_type || "",
    category: districtAnalyticsMap.get(row.name)?.dominant_category || "",
  }));

  const loadDBSCAN = useCallback(async () => {
    const res = await fetchHotspots(token);
    const nextHotspots = res.data || [];
    setHotspots(nextHotspots);
    setHeatPoints([]);
    setSelectedHotspotId((current) =>
      current && nextHotspots.some((item: Hotspot) => item.clusterId === current)
        ? current
        : null
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
    hotspots.find((hotspot) => hotspot.clusterId === selectedHotspotId) || null;
  const totalVisibleIncidents = hotspots.reduce((sum, hotspot) => sum + hotspot.crimeCount, 0);
  const hotspotCount = hotspots.length;

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
            <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[var(--fg-secondary)]">
              Fast read of cluster density, heat, and risk layers with a focused right-side drawer.
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

        <div className="mt-6 grid gap-3 md:grid-cols-3 xl:grid-cols-4">
          {[
            { label: "Hotspots", value: fmt(hotspotCount), tone: "text-[var(--accent-700)]" },
            { label: "Visible incidents", value: fmt(totalVisibleIncidents), tone: "text-[var(--risk-high)]" },
            { label: "Mode", value: mode === MODE_DBSCAN ? "Cluster map" : "Heatmap", tone: "text-[var(--fg-primary)]" },
          ].map((item) => (
            <div key={item.label} className="rounded-[20px] border bg-[var(--bg-surface)] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--fg-tertiary)]">
                {item.label}
              </p>
              <p className={`mt-1 text-lg font-semibold ${item.tone}`}>{item.value}</p>
            </div>
          ))}
          <div className="flex flex-wrap gap-2 md:col-span-3 xl:col-span-1 xl:justify-end">
            {[
              { label: "Women safety heat", active: showWomenSafety, onClick: () => setShowWomenSafety((v) => !v), title: "Overlay heatmap of women-safety incidents (eve teasing, assault, rape)" },
              { label: "District shading", active: showDistrictShading, onClick: () => setShowDistrictShading((v) => !v), title: "Colour-fill districts by crime density" },
            ].map((item) => (
              <button
                key={item.label}
                title={item.title}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  item.active
                    ? "bg-[var(--accent-50)] text-[var(--accent-700)] ring-1 ring-[var(--accent-500)]"
                    : "border bg-[var(--bg-surface)] text-[var(--fg-secondary)]"
                }`}
                onClick={item.onClick}
              >
                {item.label}
              </button>
            ))}
          </div>
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
                <button
                  onClick={() => setIsFullscreen(true)}
                  className="inline-flex items-center gap-2 rounded-2xl border bg-[var(--bg-surface)] px-3 py-2 text-sm font-medium text-[var(--fg-secondary)] hover:bg-[var(--bg-subtle)] transition"
                  title="Fullscreen map"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
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
              onModeChange={setMode}
              firIncidents={firPins}
            />
            <Drawer open={!!selectedHotspot} onClose={() => setSelectedHotspotId(null)} width="w-80" backdrop={false}>
              <HotspotDetail
                hotspot={selectedHotspot}
                fmt={fmt}
                onShowFirs={() => {
                  /* TODO: wire to FIR listing */
                }}
                onDispatch={() => {
                  /* TODO: dispatch action */
                }}
              />
            </Drawer>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="surface-card rounded-[28px] p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--fg-primary)]">
              <Flame className="h-4 w-4 text-[var(--risk-medium)]" />
              Quick summary
            </div>
            <div className="mt-4 grid gap-3">
              <div className="rounded-[20px] border bg-[var(--bg-subtle)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fg-tertiary)]">Top district</p>
                <p className="mt-2 text-base font-semibold text-[var(--fg-primary)]">
                  {districtTotals.slice().sort((a, b) => b.crime_count - a.crime_count)[0]?.name || "N/A"}
                </p>
              </div>
              <div className="rounded-[20px] border bg-[var(--bg-subtle)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fg-tertiary)]">Selected cluster</p>
                <p className="mt-2 text-base font-semibold text-[var(--fg-primary)]">
                  {selectedHotspot ? selectedHotspot.clusterId : "None"}
                </p>
              </div>
            </div>
          </div>

          <div className="surface-card rounded-[28px] p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--fg-primary)]">
              <Siren className="h-4 w-4 text-[var(--accent-500)]" />
              Next step
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--fg-secondary)]">
              Click a cluster to inspect the drawer, then use the FIR and patrol actions.
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
        {/* Station-wise crime totals */}
        <div className="surface-card rounded-[28px] p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">Station-wise crime totals</h3>
              <p className="mt-1 text-sm text-[var(--fg-secondary)]">Compact preview with a CSV download for the full station list.</p>
            </div>
            <button
              type="button"
              onClick={() => downloadCsv("station-wise-crime-totals.csv", stationCsvRows)}
              className="inline-flex items-center gap-2 rounded-full border bg-[var(--bg-surface)] px-3 py-1 text-xs font-semibold text-[var(--accent-700)] transition hover:bg-[var(--accent-50)]"
            >
              <ChevronRight className="h-3.5 w-3.5" />
              View data
            </button>
          </div>

          <div className="mt-4 overflow-hidden rounded-[22px] border min-h-[320px]">
            <div className="max-h-[360px] overflow-y-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-[var(--bg-surface)] border-b border-[var(--border-default)] text-xs uppercase tracking-[0.12em] text-[var(--fg-tertiary)]">
                  <tr>
                    <th className="px-3 py-3">District</th>
                    <th className="px-3 py-3">Station</th>
                    <th className="px-3 py-3">Crimes</th>
                    <th className="px-3 py-3">Dominant crime</th>
                    <th className="px-3 py-3">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {topStationPreview.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center text-[var(--fg-tertiary)]">No station totals yet.</td>
                    </tr>
                  ) : null}
                  {topStationPreview.map((row) => {
                    const analytic: ZoneAnalyticsRow = stationAnalyticsMap.get(row.name) ?? { name: row.name };
                    return (
                      <tr key={row.name} className="border-t">
                        <td className="px-3 py-3">{row.district_name || "-"}</td>
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
        </div>

        {/* District-wise crime totals */}
        <div className="surface-card rounded-[28px] p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">District-wise crime totals</h3>
              <p className="mt-1 text-sm text-[var(--fg-secondary)]">Compact preview with a CSV download for the full district list.</p>
            </div>
            <button
              type="button"
              onClick={() => downloadCsv("district-wise-crime-totals.csv", districtCsvRows)}
              className="inline-flex items-center gap-2 rounded-full border bg-[var(--bg-surface)] px-3 py-1 text-xs font-semibold text-[var(--accent-700)] transition hover:bg-[var(--accent-50)]"
            >
              <ChevronRight className="h-3.5 w-3.5" />
              View data
            </button>
          </div>

          <div className="mt-4 overflow-hidden rounded-[22px] border min-h-[320px]">
            <div className="max-h-[360px] overflow-y-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-[var(--bg-surface)] border-b border-[var(--border-default)] text-xs uppercase tracking-[0.12em] text-[var(--fg-tertiary)]">
                  <tr>
                    <th className="px-3 py-3">District</th>
                    <th className="px-3 py-3">Crimes</th>
                    <th className="px-3 py-3">Dominant crime</th>
                    <th className="px-3 py-3">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {topDistrictPreview.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-[var(--fg-tertiary)]">No district totals yet.</td>
                    </tr>
                  ) : null}
                  {topDistrictPreview.map((row) => {
                    const analytic: ZoneAnalyticsRow = districtAnalyticsMap.get(row.name) ?? { name: row.name };
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
        </div>
      </section>

      {/* Fullscreen map modal */}
      {isFullscreen && (
        <div className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen z-[9999] bg-black flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-6 py-4 flex-shrink-0">
            <div>
              <h2 className="text-lg font-semibold text-[var(--fg-primary)]">Hotspot Command Map</h2>
              <p className="mt-1 text-sm text-[var(--fg-secondary)]">Full-screen view</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFullscreen(false)}
                className="inline-flex items-center gap-2 rounded-2xl border bg-[var(--bg-subtle)] px-4 py-2 text-sm font-medium text-[var(--fg-secondary)] hover:bg-[var(--bg-surface)] transition"
                title="Exit fullscreen"
              >
                <Minimize2 className="h-4 w-4" />
                Exit
              </button>
              <button
                onClick={() => setIsFullscreen(false)}
                className="inline-flex items-center gap-2 rounded-2xl border bg-[var(--risk-50)] px-3 py-2 text-sm font-medium text-[var(--risk-high)] hover:bg-[var(--risk-100)] transition"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Map container - full viewport */}
          <div className="flex-1 w-full overflow-hidden">
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
              onModeChange={setMode}
              firIncidents={firPins}
            />
          </div>
        </div>
      )}
    </div>
  );
}
