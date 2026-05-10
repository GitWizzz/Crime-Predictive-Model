"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Circle, CircleMarker, GeoJSON, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { Feature, FeatureCollection, GeoJsonObject, Geometry } from "geojson";

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);

const BIHAR_CENTER: [number, number] = [25.6, 85.2];
const BIHAR_BOUNDS: [[number, number], [number, number]] = [
  [24.3, 83.2],
  [27.5, 88.5],
];

const STADIA_STREET = "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png";
const STADIA_SATELLITE = "https://tiles.stadiamaps.com/tiles/alidade_satellite/{z}/{x}/{y}{r}.png";
const TILE_ATTRIBUTION = '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>';

type Hotspot = {
  clusterId: string;
  centroid: { type: "Point"; coordinates: [number, number] };
  boundary: unknown;
  crimeCount: number;
  crimeDistribution?: Record<string, number>;
};

type HeatPoint = {
  lat: number;
  lon: number;
  intensity: number;
};

type MapFeatureProperties = {
  name?: string;
  crime_count?: number;
};

type MapFeature = Feature<Geometry, MapFeatureProperties>;
type MapFeatureCollection = FeatureCollection<Geometry, MapFeatureProperties>;

type FIRPin = {
  id: number;
  lat: number;
  lon: number;
  crimeType: string;
  location?: string;
  dateTime?: string;
};

type HotspotsMapProps = {
  mode: "dbscan" | "kde" | "both";
  hotspots: Hotspot[];
  heatPoints: HeatPoint[];
  womenHeatPoints?: HeatPoint[];
  accidentHeatPoints?: HeatPoint[];
  districts?: GeoJsonObject | null;
  stateBoundary?: GeoJsonObject | null;
  stations?: GeoJsonObject | null;
  showDistrictShading?: boolean;
  selectedHotspotId?: string | null;
  onSelectHotspot?: (id: string | null) => void;
  onModeChange?: (mode: "dbscan" | "kde") => void;
  compact?: boolean;
  firIncidents?: FIRPin[];
};

const CRIME_COLORS: Record<string, string> = {
  theft: "#3b82f6",
  robbery: "#f97316",
  assault: "#ef4444",
  murder: "#dc2626",
  rape: "#9f1239",
  kidnapping: "#8b5cf6",
  fraud: "#0ea5e9",
  "eve teasing": "#ec4899",
  accident: "#64748b",
  burglary: "#92400e",
  dacoity: "#b91c1c",
};

const getCrimeColor = (type: string) => {
  const key = (type || "").toLowerCase().trim();
  for (const [k, v] of Object.entries(CRIME_COLORS)) {
    if (key.includes(k)) return v;
  }
  return "#6b7280";
};

const summarizeDistribution = (dist?: Record<string, number>) =>
  Object.entries(dist || {})
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 4);

const isCoordinatePair = (c: unknown): c is [number, number] =>
  Array.isArray(c) && typeof c[0] === "number" && typeof c[1] === "number";

const toLatLng = (coordinates: unknown): [number, number] | null => {
  if (!isCoordinatePair(coordinates)) return null;
  const [lon, lat] = coordinates;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return [lat, lon];
};

// 5-level colour scale: safe → moderate → elevated → high → critical
const RISK_COLORS = ["#dcfce7", "#86efac", "#fde68a", "#f97316", "#dc2626"];
const getDistrictFill = (count: number, thresholds: number[]) => {
  const [t1, t2, t3, t4] = thresholds;
  if (count > t4) return RISK_COLORS[4];
  if (count > t3) return RISK_COLORS[3];
  if (count > t2) return RISK_COLORS[2];
  if (count > t1) return RISK_COLORS[1];
  return RISK_COLORS[0];
};

const getQuantileThresholds = (counts: number[]) => {
  if (!counts.length) return [0, 0, 0, 0];
  const sorted = [...counts].sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.floor(p * (sorted.length - 1))] ?? 0;
  return [q(0.2), q(0.45), q(0.7), q(0.88)];
};

const getRiskTone = (crimeCount: number, maxCount: number) => {
  const ratio = maxCount > 0 ? crimeCount / maxCount : 0;
  if (ratio >= 0.8) return { color: "#dc2626", fill: "#f87171" };
  if (ratio >= 0.55) return { color: "#f59e0b", fill: "#fbbf24" };
  if (ratio >= 0.3) return { color: "#3b82f6", fill: "#60a5fa" };
  return { color: "#22c55e", fill: "#4ade80" };
};

const FitBounds = ({ bounds, padding = 28 }: { bounds: [[number, number], [number, number]]; padding?: number }) => {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [padding, padding] });
  }, [bounds, padding, map]);
  return null;
};

const InvalidateSizeOnResize = ({ trigger }: { trigger: boolean }) => {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 80);
    return () => clearTimeout(t);
  }, [trigger, map]);
  return null;
};

const parseDistrictName = (clusterId: string) =>
  clusterId.replace(/^cluster[_-]?/i, "").replace(/_/g, " ").trim();

const buildClusterDescription = (dist?: Record<string, number>, total?: number): string => {
  if (!dist || !total) return "";
  const top = Object.entries(dist).sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (!top.length) return "";
  const [first, second] = top;
  const pct = (n: number) => Math.round((n / total) * 100);
  let desc = `Predominantly ${first[0].toLowerCase()} (${pct(first[1])}% of incidents)`;
  if (second) desc += `, also ${second[0].toLowerCase()} (${pct(second[1])}%)`;
  return desc + ".";
};

export default function HotspotsMap({
  mode,
  hotspots,
  heatPoints,
  womenHeatPoints = [],
  accidentHeatPoints = [],
  districts,
  stateBoundary,
  stations,
  showDistrictShading = false,
  selectedHotspotId = null,
  onSelectHotspot,
  onModeChange,
  compact = false,
  firIncidents = [],
}: HotspotsMapProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapStyle, setMapStyle] = useState<"street" | "satellite">("street");
  const [staticDistricts, setStaticDistricts] = useState<MapFeatureCollection | null>(null);
  const [drillMode, setDrillMode] = useState(false);
  const [selectedPin, setSelectedPin] = useState<FIRPin | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<{
    name: string;
    count: number;
    riskLevel: string;
    riskColor: string;
    fillColor: string;
    rank: number;
    total: number;
    maxCount: number;
    stateTotal: number;
    bounds: [[number, number], [number, number]] | null;
  } | null>(null);

  // Load real Bihar district GeoJSON from static file
  useEffect(() => {
    fetch("/bihar_districts.geojson")
      .then((r) => r.json())
      .then((data: MapFeatureCollection) => setStaticDistricts(data))
      .catch(() => {});
  }, []);

  // Build name → crime_count lookup from the API `districts` prop
  const districtCrimeMap = useMemo(() => {
    const map = new Map<string, number>();
    if (districts?.type === "FeatureCollection") {
      (districts as MapFeatureCollection).features.forEach((f) => {
        const name = (f.properties?.name || "").toLowerCase().trim();
        const count = Number(f.properties?.crime_count || 0);
        if (name) map.set(name, count);
      });
    }
    return map;
  }, [districts]);

  // Merge crime_count into the static GeoJSON
  const enrichedDistricts = useMemo<MapFeatureCollection | null>(() => {
    if (!staticDistricts) return null;
    return {
      ...staticDistricts,
      features: staticDistricts.features.map((f) => {
        const name = (f.properties?.name || "").toLowerCase().trim();
        return {
          ...f,
          properties: {
            ...f.properties,
            crime_count: districtCrimeMap.get(name) ?? 0,
          },
        };
      }),
    };
  }, [staticDistricts, districtCrimeMap]);

  const districtCounts = useMemo(
    () => (enrichedDistricts?.features || []).map((f) => Number(f.properties?.crime_count || 0)),
    [enrichedDistricts]
  );

  const thresholds = useMemo(() => getQuantileThresholds(districtCounts), [districtCounts]);

  const stationCenters = useMemo(() => {
    if (!stations || stations.type !== "FeatureCollection") return [];
    return (stations as MapFeatureCollection).features
      .map((f) => ({
        name: f.properties?.name || "Station",
        center: (() => {
          const coords = (f.geometry as { coordinates?: unknown })?.coordinates;
          if (!coords) return null;
          if (f.geometry.type === "Point") {
            const p = coords as [number, number];
            return [p[1], p[0]] as [number, number];
          }
          return null;
        })(),
      }))
      .filter((s): s is { name: string; center: [number, number] } => s.center !== null);
  }, [stations]);

  const validHotspots = useMemo(
    () => hotspots.filter((h) => Array.isArray(toLatLng(h?.centroid?.coordinates))),
    [hotspots]
  );

  const maxCount = useMemo(
    () => Math.max(...validHotspots.map((h) => h.crimeCount), 1),
    [validHotspots]
  );

  const center: [number, number] =
    toLatLng(validHotspots.find((h) => h.clusterId === selectedHotspotId)?.centroid?.coordinates) ||
    toLatLng(validHotspots[0]?.centroid?.coordinates) ||
    BIHAR_CENTER;

  useEffect(() => {
    document.body.style.overflow = isFullscreen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isFullscreen]);

  return (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-50 bg-[var(--bg-base)]"
          : compact
            ? "relative h-[320px] w-full overflow-hidden rounded-[26px] border bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]"
            : "relative h-[72vh] min-h-[560px] w-full overflow-hidden rounded-[28px] border bg-[var(--bg-surface)] shadow-[var(--shadow-md)]"
      }
    >
      <MapContainer center={center} zoom={7} minZoom={6} maxZoom={16} className="h-full w-full" zoomControl={!compact}>
        <TileLayer
          url={mapStyle === "satellite" ? STADIA_SATELLITE : STADIA_STREET}
          attribution={TILE_ATTRIBUTION}
        />

        <FitBounds
          bounds={drillMode && selectedDistrict?.bounds ? selectedDistrict.bounds : BIHAR_BOUNDS}
          padding={drillMode ? 48 : 28}
        />
        <InvalidateSizeOnResize trigger={isFullscreen} />

        {/* State boundary */}
        {stateBoundary ? (
          <GeoJSON
            data={stateBoundary}
            style={() => ({
              color: mapStyle === "street" ? "#60a5fa" : "#f8fafc",
              weight: 2.4,
              opacity: 0.85,
              fillOpacity: 0,
            })}
          />
        ) : null}

        {/* Real Bihar district polygons enriched with crime counts */}
        {enrichedDistricts ? (
          <GeoJSON
            key={`districts-${districtCounts.join(",")}-${showDistrictShading}-${mapStyle}-${drillMode}`}
            data={enrichedDistricts}
            onEachFeature={(feature, layer) => {
              const f = feature as MapFeature;
              const name = f.properties?.name || "District";
              const count = Number(f.properties?.crime_count || 0);
              const fillColor = getDistrictFill(count, thresholds);
              const borderColor = mapStyle === "street" ? "#93c5fd" : "#f8fafc";

              const baseFill = showDistrictShading ? fillColor : "#dcfce7";
              const baseStyle = {
                color: drillMode ? "#94a3b8" : borderColor,
                weight: drillMode ? 1 : 1.2,
                opacity: drillMode ? 0.5 : 0.8,
                fillOpacity: drillMode ? 0 : showDistrictShading ? 0.4 : 0.35,
                fillColor: baseFill,
              };
              const hoverStyle = {
                color: "#60a5fa",
                weight: drillMode ? 2 : 2.6,
                opacity: 1,
                fillOpacity: drillMode ? 0.06 : showDistrictShading ? 0.62 : 0.52,
                fillColor: baseFill,
              };

              layer.on("mouseover", () => (layer as unknown as { setStyle: (s: object) => void }).setStyle(hoverStyle));
              layer.on("mouseout", () => (layer as unknown as { setStyle: (s: object) => void }).setStyle(baseStyle));

              layer.on("click", () => {
                const riskLevel =
                  count > thresholds[3] ? "Critical" :
                  count > thresholds[2] ? "High" :
                  count > thresholds[1] ? "Elevated" :
                  count > thresholds[0] ? "Moderate" : "Low";
                const riskColor =
                  count > thresholds[3] ? "#dc2626" :
                  count > thresholds[2] ? "#f97316" :
                  count > thresholds[1] ? "#f59e0b" :
                  count > thresholds[0] ? "#3b82f6" : "#15803d";
                const allCounts = [...districtCrimeMap.values()];
                const sorted = [...allCounts].sort((a, b) => b - a);
                const rank = sorted.indexOf(count) + 1;
                const stateTotal = allCounts.reduce((a, b) => a + b, 0);
                const maxCount = sorted[0] ?? count;
                const lb = (layer as unknown as { getBounds?: () => { getSouthWest: () => { lat: number; lng: number }; getNorthEast: () => { lat: number; lng: number } } }).getBounds?.();
                const bounds: [[number, number], [number, number]] | null = lb
                  ? [[lb.getSouthWest().lat, lb.getSouthWest().lng], [lb.getNorthEast().lat, lb.getNorthEast().lng]]
                  : null;
                setDrillMode(false);
                setSelectedDistrict({ name, count, riskLevel, riskColor, fillColor, rank, total: sorted.length, maxCount, stateTotal, bounds });
              });
            }}
            style={(feature) => {
              const count = Number((feature as MapFeature | undefined)?.properties?.crime_count || 0);
              return {
                color: drillMode ? "#93c5fd" : mapStyle === "street" ? "#93c5fd" : "#f8fafc",
                weight: drillMode ? 1 : 1.2,
                opacity: drillMode ? 0.5 : 0.8,
                fillOpacity: drillMode ? 0 : showDistrictShading ? 0.4 : 0.35,
                fillColor: showDistrictShading ? getDistrictFill(count, thresholds) : "#dcfce7",
              };
            }}
          />
        ) : null}

        {/* Police station markers */}
        {stationCenters.map((s) => (
          <CircleMarker
            key={s.name}
            center={s.center}
            radius={4}
            pathOptions={{ color: "#f59e0b", weight: 2, fillColor: "#fff7ed", fillOpacity: 1 }}
          >
            <Popup>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>Police station</div>
            </Popup>
          </CircleMarker>
        ))}

        {/* DBSCAN cluster circles — hidden in drill mode */}
        {!drillMode && (mode === "dbscan" || mode === "both")
          ? validHotspots.map((hotspot) => {
              const centerPoint = toLatLng(hotspot.centroid.coordinates);
              if (!centerPoint) return null;
              const tone = getRiskTone(hotspot.crimeCount, maxCount);
              const selected = hotspot.clusterId === selectedHotspotId;
              const radius = Math.max(350, Math.min(2200, hotspot.crimeCount * 22));

              return (
                <Circle
                  key={hotspot.clusterId}
                  center={centerPoint}
                  radius={radius}
                  pathOptions={{
                    color: tone.color,
                    weight: selected ? 3.2 : 2,
                    opacity: selected ? 1 : 0.85,
                    fillColor: tone.fill,
                    fillOpacity: selected ? 0.28 : 0.16,
                  }}
                  eventHandlers={{ click: () => onSelectHotspot?.(hotspot.clusterId) }}
                >
                  <Popup minWidth={220}>
                    {(() => {
                      const districtName = parseDistrictName(hotspot.clusterId);
                      const desc = buildClusterDescription(hotspot.crimeDistribution, hotspot.crimeCount);
                      const tone = getRiskTone(hotspot.crimeCount, maxCount);
                      const [lon, lat] = hotspot.centroid.coordinates;
                      return (
                        <div style={{ fontFamily: "system-ui,sans-serif", padding: "2px 0" }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 2 }}>Crime cluster</div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: "#0b0d10", marginBottom: 2 }}>{districtName}</div>
                          <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 10 }}>{lat.toFixed(4)}°N, {lon.toFixed(4)}°E · Bihar</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                            <span style={{ fontSize: 22, fontWeight: 900, color: tone.color, lineHeight: 1 }}>{hotspot.crimeCount.toLocaleString("en-IN")}</span>
                            <span style={{ fontSize: 11, color: "#6b7280" }}>total incidents</span>
                          </div>
                          {desc && <div style={{ fontSize: 11, color: "#374151", lineHeight: 1.6, marginBottom: 10, padding: "8px 10px", background: "#f8fafc", borderRadius: 8 }}>{desc}</div>}
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Top crime types</div>
                          {summarizeDistribution(hotspot.crimeDistribution).map(([type, cnt]) => (
                            <div key={type} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, gap: 12, marginBottom: 4 }}>
                              <span style={{ color: "#374151" }}>{type}</span>
                              <strong style={{ color: "#0b0d10" }}>{cnt}</strong>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </Popup>
                </Circle>
              );
            })
          : null}

        {/* DBSCAN core dots — hidden in drill mode */}
        {!drillMode && (mode === "dbscan" || mode === "both")
          ? validHotspots.map((hotspot) => {
              const [lon, lat] = hotspot.centroid.coordinates;
              if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
              const centerPoint: [number, number] = [lat, lon];
              const tone = getRiskTone(hotspot.crimeCount, maxCount);
              const selected = hotspot.clusterId === selectedHotspotId;

              return (
                <CircleMarker
                  key={`${hotspot.clusterId}-core`}
                  center={centerPoint}
                  radius={selected ? 14 : 11}
                  pathOptions={{
                    color: "#1e293b",
                    weight: 2,
                    fillColor: tone.fill,
                    fillOpacity: 1,
                  }}
                  eventHandlers={{ click: () => onSelectHotspot?.(hotspot.clusterId) }}
                >
                  <Tooltip direction="top" offset={[0, -6]} className="cluster-tip">
                    <span style={{ fontSize: 11, fontWeight: 700, color: tone.color }}>{hotspot.crimeCount} incidents</span>
                    <span style={{ fontSize: 10, color: "#6b7280", display: "block" }}>{hotspot.clusterId}</span>
                  </Tooltip>
                </CircleMarker>
              );
            })
          : null}

        {/* KDE heat circles */}
        {(mode === "kde" || mode === "both")
          ? heatPoints.map((pt, i) => {
              const intensity = Math.max(0.15, Math.min(1, pt.intensity));
              const color = intensity > 0.72 ? "#dc2626" : intensity > 0.45 ? "#f59e0b" : "#3b82f6";
              return (
                <Circle
                  key={`heat-${i}`}
                  center={[pt.lat, pt.lon]}
                  radius={240 + intensity * 920}
                  pathOptions={{ color, weight: 0, fillColor: color, fillOpacity: 0.12 + intensity * 0.12 }}
                />
              );
            })
          : null}

        {/* Women safety overlay */}
        {womenHeatPoints.map((pt, i) => (
          <Circle
            key={`women-${i}`}
            center={[pt.lat, pt.lon]}
            radius={210 + Math.min(1, pt.intensity) * 760}
            pathOptions={{ color: "#db2777", weight: 0, fillColor: "#ec4899", fillOpacity: 0.16 }}
          />
        ))}

        {/* IRAD accident overlay */}
        {accidentHeatPoints.map((pt, i) => (
          <Circle
            key={`accident-${i}`}
            center={[pt.lat, pt.lon]}
            radius={190 + Math.min(1, pt.intensity) * 720}
            pathOptions={{ color: "#0ea5e9", weight: 0, fillColor: "#38bdf8", fillOpacity: 0.14 }}
          />
        ))}

        {/* Street-level FIR pins (drill-down mode) */}
        {drillMode && selectedDistrict?.bounds && (() => {
          const [[s, w], [n, e]] = selectedDistrict.bounds;
          const pins = firIncidents.filter(
            (f) => f.lat >= s && f.lat <= n && f.lon >= w && f.lon <= e
              && Number.isFinite(f.lat) && Number.isFinite(f.lon)
          );
          return pins.map((fir) => {
            const color = getCrimeColor(fir.crimeType);
            const isSelected = selectedPin?.id === fir.id;
            return (
              <CircleMarker
                key={`fir-${fir.id}`}
                center={[fir.lat, fir.lon]}
                radius={isSelected ? 10 : 6}
                pathOptions={{
                  color: isSelected ? "#0b0d10" : "#ffffff",
                  weight: isSelected ? 2.5 : 1.4,
                  fillColor: color,
                  fillOpacity: isSelected ? 1 : 0.88,
                }}
                eventHandlers={{ click: () => setSelectedPin(isSelected ? null : fir) }}
              >
                <Tooltip direction="top" offset={[0, -5]} className="cluster-tip">
                  <span style={{ fontWeight: 700, fontSize: 12, color }}>{fir.crimeType || "Unknown"}</span>
                  {fir.location && <span style={{ fontSize: 11, color: "#6b7280", display: "block" }}>{fir.location}</span>}
                  <span style={{ fontSize: 10, color: "#9ca3af", display: "block" }}>Click for details · FIR #{fir.id}</span>
                </Tooltip>
              </CircleMarker>
            );
          });
        })()}
      </MapContainer>

      {/* Top-left controls */}
      <div className={`map-panel absolute left-4 top-4 z-[1000] ${compact ? "flex" : "hidden md:flex"} items-center gap-2 rounded-2xl px-3 py-2 text-xs font-medium text-[var(--fg-secondary)]`}>
        <button
          type="button"
          onClick={() => setMapStyle("street")}
          className={`rounded-xl px-3 py-1.5 transition ${mapStyle === "street" ? "bg-[var(--accent-50)] text-[var(--accent-700)]" : ""}`}
        >
          Street
        </button>
        <button
          type="button"
          onClick={() => setMapStyle("satellite")}
          className={`rounded-xl px-3 py-1.5 transition ${mapStyle === "satellite" ? "bg-[var(--accent-50)] text-[var(--accent-700)]" : ""}`}
        >
          Satellite
        </button>
        {!compact && onModeChange && (
          <>
            <span className="h-4 w-px bg-[var(--border-default)]" />
            <button
              type="button"
              onClick={() => onModeChange(mode === "dbscan" ? "kde" : "dbscan")}
              className="rounded-xl px-3 py-1.5 transition bg-[var(--bg-subtle)] text-[var(--fg-secondary)] hover:bg-[var(--accent-50)] hover:text-[var(--accent-700)]"
            >
              {mode === "dbscan" ? "Clusters" : "Heatmap"} ⇄
            </button>
          </>
        )}
      </div>

      {/* Top-right fullscreen */}
      {!compact ? (
        <div className="absolute right-4 top-4 z-[1000] flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setIsFullscreen((v) => !v)}
            className="map-panel rounded-2xl px-3 py-2 text-xs font-medium text-[var(--fg-secondary)]"
          >
            {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          </button>
          {selectedHotspotId ? (
            <button
              type="button"
              onClick={() => onSelectHotspot?.(null)}
              className="map-panel rounded-2xl px-3 py-2 text-xs font-medium text-[var(--fg-secondary)]"
            >
              Clear selection
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Bottom-left legend */}
      <div className={`map-panel absolute ${compact ? "bottom-3 left-3" : "bottom-5 left-5"} z-[1000] rounded-[20px] px-4 py-3 text-xs text-[var(--fg-secondary)]`}>
        {!compact && (
          <div className="mb-2 font-semibold text-[var(--fg-primary)]">Risk scale</div>
        )}
        <div className="flex items-center gap-1">
          {RISK_COLORS.map((color, i) => (
            <span key={i} style={{ width: 18, height: 10, borderRadius: 3, background: color, display: "inline-block" }} />
          ))}
        </div>
        {!compact && (
          <div className="mt-1 flex justify-between text-[10px] text-[var(--fg-tertiary)]">
            <span>Low</span>
            <span>Critical</span>
          </div>
        )}
      </div>

      {/* FIR pin detail panel — shown when a street-wise crime dot is clicked */}
      {selectedPin && drillMode && selectedDistrict && !compact && (() => {
        const color = getCrimeColor(selectedPin.crimeType);
        const fmt = (dt: string) => {
          try { return new Date(dt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
          catch { return dt; }
        };
        return (
          <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", zIndex: 1002, width: 256, background: "rgba(255,255,255,0.98)", backdropFilter: "blur(16px)", borderRadius: 22, border: "1px solid #e4e7eb", boxShadow: "0 8px 36px rgba(0,0,0,0.16)", overflow: "hidden" }}>
            {/* Crime colour strip */}
            <div style={{ height: 5, background: color, borderRadius: "22px 22px 0 0" }} />

            {/* Header */}
            <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>
                    {selectedDistrict.name} · Crime incident
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color, lineHeight: 1.2, display: "flex", alignItems: "center", gap: 8 }}>
                    {selectedPin.crimeType || "Unknown"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPin(null)}
                  style={{ background: "#f1f5f9", border: "none", borderRadius: 8, width: 26, height: 26, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#6b7280", flexShrink: 0 }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Details */}
            <div style={{ padding: "14px 16px" }}>
              {/* FIR ID badge */}
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: color + "12", border: `1px solid ${color}28`, borderRadius: 10, padding: "5px 12px", marginBottom: 14 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, display: "inline-block" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color }}>FIR #{selectedPin.id}</span>
              </div>

              {/* Info rows */}
              {[
                { label: "Crime type", value: selectedPin.crimeType || "Unknown" },
                selectedPin.location ? { label: "Location", value: selectedPin.location } : null,
                selectedPin.dateTime ? { label: "Date & time", value: fmt(selectedPin.dateTime) } : null,
                { label: "Coordinates", value: `${selectedPin.lat.toFixed(4)}, ${selectedPin.lon.toFixed(4)}` },
                { label: "District", value: selectedDistrict.name },
              ].filter(Boolean).map((row) => (
                <div key={row!.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, flexShrink: 0 }}>{row!.label}</span>
                  <span style={{ fontSize: 12, color: "#374151", fontWeight: 600, textAlign: "right", wordBreak: "break-word" }}>{row!.value}</span>
                </div>
              ))}

              {/* Back button */}
              <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 12, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setSelectedPin(null)}
                  style={{ width: "100%", padding: "10px 0", borderRadius: 14, border: "1.5px solid #e4e7eb", background: "#ffffff", color: "#374151", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  ← Back to {selectedDistrict.name}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* District detail panel — slides in from left on district click */}
      {selectedDistrict && !selectedPin && !compact && (
        <div
          style={{
            position: "absolute",
            left: 16,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 1001,
            width: 248,
            background: "rgba(255,255,255,0.97)",
            backdropFilter: "blur(16px)",
            borderRadius: 22,
            border: "1px solid #e4e7eb",
            boxShadow: "0 8px 36px rgba(0,0,0,0.14)",
            overflow: "hidden",
          }}
        >
          {/* Risk colour strip at top */}
          <div style={{ height: 5, background: selectedDistrict.riskColor, borderRadius: "22px 22px 0 0" }} />

          {/* Header */}
          <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>Bihar · District</div>
                <div style={{ fontSize: 19, fontWeight: 800, color: "#0b0d10", lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{selectedDistrict.name}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => { setSelectedDistrict(null); setDrillMode(false); setSelectedPin(null); }}
                  style={{ background: "#f1f5f9", border: "none", borderRadius: 8, width: 26, height: 26, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#6b7280" }}
                >
                  ✕
                </button>
                <span style={{ fontSize: 11, fontWeight: 700, color: selectedDistrict.riskColor, background: selectedDistrict.riskColor + "15", padding: "2px 9px", borderRadius: 20, border: `1px solid ${selectedDistrict.riskColor}30` }}>
                  {selectedDistrict.riskLevel}
                </span>
              </div>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: "14px 16px" }}>
            {/* FIR count */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 40, fontWeight: 900, color: "#0b0d10", lineHeight: 1, letterSpacing: "-0.02em" }}>
                {selectedDistrict.count.toLocaleString("en-IN")}
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>registered FIRs</div>
            </div>

            {/* Share of Bihar crimes bar */}
            {(() => {
              const sharePct = selectedDistrict.stateTotal > 0
                ? +((selectedDistrict.count / selectedDistrict.stateTotal) * 100).toFixed(1)
                : 0;
              const barPct = selectedDistrict.maxCount > 0
                ? Math.round((selectedDistrict.count / selectedDistrict.maxCount) * 100)
                : 100;
              return (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 11, fontWeight: 600 }}>
                    <span style={{ color: "#6b7280" }}>Share of Bihar crimes</span>
                    <span style={{ color: selectedDistrict.riskColor, fontWeight: 700 }}>{sharePct}%</span>
                  </div>
                  <div style={{ height: 7, borderRadius: 4, background: "#f1f5f9", overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 4, background: selectedDistrict.riskColor, width: `${barPct}%`, transition: "width 0.5s" }} />
                  </div>
                  <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 4 }}>
                    {barPct}% of top district · {selectedDistrict.stateTotal.toLocaleString("en-IN")} total in Bihar
                  </div>
                </div>
              );
            })()}

            {/* Rank chip */}
            <div style={{ background: "#f8fafc", borderRadius: 14, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>State rank</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#0b0d10" }}>
                #{selectedDistrict.rank}
                <span style={{ fontSize: 11, fontWeight: 400, color: "#9ca3af" }}> of {selectedDistrict.total} districts</span>
              </span>
            </div>

            {/* Street-wise drill-down button */}
            {selectedDistrict.bounds && (
              <button
                type="button"
                onClick={() => { setDrillMode((v) => !v); setSelectedPin(null); }}
                style={{
                  width: "100%",
                  padding: "11px 0",
                  borderRadius: 14,
                  border: drillMode ? "1.5px solid #e4e7eb" : "none",
                  background: drillMode ? "#ffffff" : "#0b0d10",
                  color: drillMode ? "#374151" : "#ffffff",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  letterSpacing: "-0.01em",
                }}
              >
                {drillMode ? "← Back to state view" : "📍 View street-wise crimes"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Crime-type legend — visible in drill mode */}
      {drillMode && selectedDistrict && !compact && (
        <div
          style={{
            position: "absolute",
            bottom: 20,
            right: 16,
            zIndex: 1001,
            background: "rgba(255,255,255,0.97)",
            backdropFilter: "blur(12px)",
            borderRadius: 16,
            border: "1px solid #e4e7eb",
            boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
            padding: "12px 14px",
            minWidth: 170,
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Crime types</div>
          {Object.entries(CRIME_COLORS).map(([label, color]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0, border: "1.5px solid #fff", boxShadow: `0 0 0 1px ${color}` }} />
              <span style={{ fontSize: 11, color: "#374151", fontWeight: 500, textTransform: "capitalize" }}>{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
