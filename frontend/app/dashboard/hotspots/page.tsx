"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import HotspotsMap from "@/components/map/HotspotsMap";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fetchFIRs, fetchHotspots, fetchKDEHotspots } from "@/services/hotspots";
import { fetchZones } from "@/services/zones";
import { fetchZoneAnalytics, fetchWomenSafety } from "@/services/analytics";
import { fetchIradHotspots } from "@/services/irad";

const MODE_DBSCAN = "dbscan";
const MODE_KDE = "kde";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

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

type ZoneTotal = {
  name: string;
  crime_count: number;
  district_name?: string | null;
};

const DistrictChart = ({
  totals,
  topN,
  onTopNChange,
}: {
  totals: ZoneTotal[];
  topN: number;
  onTopNChange: (value: number) => void;
}) => {
  const data = [...totals]
    .sort((a, b) => b.crime_count - a.crime_count)
    .slice(0, topN);

  if (!data.length) {
    return <div className="text-sm text-zinc-500 mt-2">No data yet.</div>;
  }

  return (
    <div className="mt-3 w-full space-y-2">
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <span>Top N:</span>
        <select
          className="rounded border px-2 py-1 text-xs"
          value={topN}
          onChange={(event) => onTopNChange(Number(event.target.value))}
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={12}>12</option>
          <option value={20}>20</option>
        </select>
      </div>
      <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} dy={10} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Bar dataKey="crime_count" fill="#16a34a" radius={[4, 4, 0, 0]} />
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
    return <div className="text-sm text-zinc-500 mt-2">No data yet.</div>;
  }

  return (
    <div className="mt-3 w-full space-y-2">
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <span>Top N:</span>
        <select
          className="rounded border px-2 py-1 text-xs"
          value={topN}
          onChange={(event) => onTopNChange(Number(event.target.value))}
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={12}>12</option>
          <option value={20}>20</option>
        </select>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} dy={10} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="crime_count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default function HotspotsPage() {
  const [mode, setMode] = useState(MODE_DBSCAN);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [heatPoints, setHeatPoints] = useState<HeatPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [districtsGeo, setDistrictsGeo] = useState<any | null>(null);
  const [stateBoundary, setStateBoundary] = useState<any | null>(null);
  const [stationsGeo, setStationsGeo] = useState<any | null>(null);
  const [districtTotals, setDistrictTotals] = useState<ZoneTotal[]>([]);
  const [stationTotals, setStationTotals] = useState<ZoneTotal[]>([]);
  const [chartDistrictTotals, setChartDistrictTotals] = useState<ZoneTotal[]>([]);
  const [chartStationTotals, setChartStationTotals] = useState<ZoneTotal[]>([]);
  const [districtAnalytics, setDistrictAnalytics] = useState<any[]>([]);
  const [stationAnalytics, setStationAnalytics] = useState<any[]>([]);
  const [topN, setTopN] = useState(12);
  const [stationTopN, setStationTopN] = useState(12);
  const [stationDistrictFilter, setStationDistrictFilter] = useState("All");
  const [zoneFilters, setZoneFilters] = useState({
    startDate: "",
    endDate: "",
  });
  const [chartFilters, setChartFilters] = useState({
    startDate: "",
    endDate: "",
  });
  const [showWomenSafety, setShowWomenSafety] = useState(false);
  const [showAccidents, setShowAccidents] = useState(false);
  const [womenHeatPoints, setWomenHeatPoints] = useState<HeatPoint[]>([]);
  const [accidentHeatPoints, setAccidentHeatPoints] = useState<HeatPoint[]>([]);
  const [showDistrictShading, setShowDistrictShading] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setToken(window.localStorage.getItem("authToken"));
    }
  }, []);

  const loadZones = useCallback(async () => {
    if (!token) return;
    try {
      const zoneParams: Record<string, string> = { type: "DISTRICT" };
      if (zoneFilters.startDate) zoneParams.startDate = zoneFilters.startDate;
      if (zoneFilters.endDate) zoneParams.endDate = zoneFilters.endDate;

      const chartParams: Record<string, string> = { type: "DISTRICT" };
      if (chartFilters.startDate) chartParams.startDate = chartFilters.startDate;
      if (chartFilters.endDate) chartParams.endDate = chartFilters.endDate;

      const [districtRes, stationRes, chartDistrictRes, chartStationRes, districtAnalyticRes, stationAnalyticRes] = await Promise.all([
        fetchZones(token, zoneParams),
        fetchZones(token, {
          ...zoneParams,
          type: "STATION",
        }),
        fetchZones(token, chartParams),
        fetchZones(token, {
          ...chartParams,
          type: "STATION",
        }),
        fetchZoneAnalytics(token, zoneParams),
        fetchZoneAnalytics(token, { ...zoneParams, type: "STATION" }),
      ]);

      setDistrictsGeo(districtRes.data?.geojson || null);
      setStateBoundary(districtRes.data?.state_boundary || null);
      const totals = districtRes.data?.totals || [];
      setDistrictTotals(totals);

      setStationsGeo(stationRes.data?.geojson || null);
      const stationTotals = stationRes.data?.totals || [];
      setStationTotals(stationTotals);

      const chartDistrictTotals = chartDistrictRes.data?.totals || [];
      const chartStationTotals = chartStationRes.data?.totals || [];
      setChartDistrictTotals(chartDistrictTotals);
      setChartStationTotals(chartStationTotals);

      setDistrictAnalytics(districtAnalyticRes.data || []);
      setStationAnalytics(stationAnalyticRes.data || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load zone boundaries."
      );
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
    stationDistrictFilter === "All"
      ? true
      : row.district_name === stationDistrictFilter
  );

  const groupedStationTotals = stationTotals.reduce<Record<string, ZoneTotal[]>>(
    (acc, row) => {
      const district = row.district_name || "Unknown District";
      if (stationDistrictFilter !== "All" && district !== stationDistrictFilter) {
        return acc;
      }
      if (!acc[district]) acc[district] = [];
      acc[district].push(row);
      return acc;
    },
    {}
  );

  const districtAnalyticsMap = new Map(
    districtAnalytics.map((row) => [row.name, row])
  );
  const stationAnalyticsMap = new Map(
    stationAnalytics.map((row) => [row.name, row])
  );

  const loadDBSCAN = async () => {
    const res = await fetchHotspots(token);
    setHotspots(res.data || []);
    setHeatPoints([]);
  };

  const loadKDE = async () => {
    const firRes = await fetchFIRs(token);
    const firs = firRes.data?.items || [];
    if (!firs.length) {
      setHeatPoints([]);
      return;
    }

    const incidents = firs.map((fir) => ({
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
  };

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
  }, [token, mode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const loadWomenSafety = async () => {
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
    loadWomenSafety();
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          className={`px-3 py-1 rounded border ${
            mode === MODE_DBSCAN
              ? "bg-zinc-900 text-white"
              : "bg-white text-zinc-900"
          }`}
          onClick={() => setMode(MODE_DBSCAN)}
        >
          DBSCAN Hotspots
        </button>
        <button
          className={`px-3 py-1 rounded border ${
            mode === MODE_KDE
              ? "bg-zinc-900 text-white"
              : "bg-white text-zinc-900"
          }`}
          onClick={() => setMode(MODE_KDE)}
        >
          KDE Heatmap
        </button>
        <button
          className="px-3 py-1 rounded border bg-white text-zinc-900"
          onClick={loadData}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>

        <label className="flex items-center gap-2 text-sm text-zinc-600">
          <input
            type="checkbox"
            checked={showWomenSafety}
            onChange={(event) => setShowWomenSafety(event.target.checked)}
          />
          Women Safety Layer
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          <input
            type="checkbox"
            checked={showAccidents}
            onChange={(event) => setShowAccidents(event.target.checked)}
          />
          IRAD Accident Layer
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          <input
            type="checkbox"
            checked={showDistrictShading}
            onChange={(event) => setShowDistrictShading(event.target.checked)}
          />
          District Shading
        </label>

        <div className="ml-auto flex flex-wrap items-center gap-2 text-sm text-zinc-600">
          <span>Zone Date Filter:</span>
          <input
            type="date"
            value={zoneFilters.startDate}
            onChange={(event) =>
              setZoneFilters((prev) => ({ ...prev, startDate: event.target.value }))
            }
            className="rounded border px-2 py-1 text-sm"
          />
          <span>to</span>
          <input
            type="date"
            value={zoneFilters.endDate}
            onChange={(event) =>
              setZoneFilters((prev) => ({ ...prev, endDate: event.target.value }))
            }
            className="rounded border px-2 py-1 text-sm"
          />
          <button
            className="px-2 py-1 rounded border bg-white text-zinc-700"
            onClick={() => setZoneFilters({ startDate: "", endDate: "" })}
          >
            Clear
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

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
      />

      <div className="rounded-lg border bg-white p-4">
        <h3 className="text-sm font-semibold text-zinc-700">
          District-wise Crime Chart
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <span>Chart Date Filter:</span>
          <input
            type="date"
            value={chartFilters.startDate}
            onChange={(event) =>
              setChartFilters((prev) => ({ ...prev, startDate: event.target.value }))
            }
            className="rounded border px-2 py-1 text-xs"
          />
          <span>to</span>
          <input
            type="date"
            value={chartFilters.endDate}
            onChange={(event) =>
              setChartFilters((prev) => ({ ...prev, endDate: event.target.value }))
            }
            className="rounded border px-2 py-1 text-xs"
          />
          <button
            className="rounded border px-2 py-1 text-xs"
            onClick={() => setChartFilters({ startDate: "", endDate: "" })}
          >
            Clear
          </button>
        </div>
        <DistrictChart
          totals={chartDistrictTotals}
          topN={topN}
          onTopNChange={setTopN}
        />
      </div>

      <div className="rounded-lg border bg-white p-4">
        <h3 className="text-sm font-semibold text-zinc-700">
          Station-wise Crime Chart
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <span>District:</span>
          <select
            className="rounded border px-2 py-1 text-xs"
            value={stationDistrictFilter}
            onChange={(event) => setStationDistrictFilter(event.target.value)}
          >
            <option value="All">All</option>
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

      <div className="rounded-lg border bg-white p-4">
        <h3 className="text-sm font-semibold text-zinc-700">
          Station-wise Crime Totals (by District)
        </h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-2">District</th>
                <th className="px-3 py-2">Station</th>
                <th className="px-3 py-2">Crimes</th>
                <th className="px-3 py-2">Dominant Crime</th>
                <th className="px-3 py-2">Dominant Category</th>
              </tr>
            </thead>
            <tbody>
              {stationTotals.length === 0 && (
                <tr>
                  <td
                    className="px-3 py-3 text-center text-sm text-zinc-500"
                    colSpan={5}
                  >
                    No station totals yet.
                  </td>
                </tr>
              )}
              {Object.entries(groupedStationTotals).map(([district, rows]) => (
                rows.map((row, index) => {
                  const analytic = stationAnalyticsMap.get(row.name) || {};
                  return (
                    <tr key={`${district}-${row.name}`} className="border-b last:border-0">
                      <td className="px-3 py-2">
                        {index === 0 ? district : ""}
                      </td>
                      <td className="px-3 py-2">{row.name}</td>
                      <td className="px-3 py-2 font-medium">{row.crime_count}</td>
                      <td className="px-3 py-2">{analytic.dominant_crime_type || "-"}</td>
                      <td className="px-3 py-2">{analytic.dominant_category || "-"}</td>
                    </tr>
                  );
                })
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <h3 className="text-sm font-semibold text-zinc-700">
          District-wise Crime Totals
        </h3>
        <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
          <button
            className="rounded border px-2 py-1"
            onClick={() => {
              if (districtTotals.length === 0) return;
              const rows = ["District,CrimeCount"].concat(
                districtTotals.map((row) => `${row.name},${row.crime_count}`)
              );
              const blob = new Blob([rows.join("\n")], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = "district_totals.csv";
              document.body.appendChild(link);
              link.click();
              link.remove();
              URL.revokeObjectURL(url);
            }}
          >
            Export CSV
          </button>
          <span>({districtTotals.length} districts)</span>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-2">District</th>
                <th className="px-3 py-2">Crimes</th>
                <th className="px-3 py-2">Dominant Crime</th>
                <th className="px-3 py-2">Dominant Category</th>
              </tr>
            </thead>
            <tbody>
              {districtTotals.length === 0 && (
                <tr>
                  <td
                    className="px-3 py-3 text-center text-sm text-zinc-500"
                    colSpan={4}
                  >
                    No district totals yet.
                  </td>
                </tr>
              )}
              {districtTotals.map((row) => {
                const analytic = districtAnalyticsMap.get(row.name) || {};
                return (
                  <tr key={row.name} className="border-b last:border-0">
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2 font-medium">{row.crime_count}</td>
                    <td className="px-3 py-2">{analytic.dominant_crime_type || "-"}</td>
                    <td className="px-3 py-2">{analytic.dominant_category || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
