"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Circle, CircleMarker, GeoJSON, Popup, TileLayer, useMap } from "react-leaflet";
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
  compact?: boolean;
};

const summarizeDistribution = (distribution?: Record<string, number>) =>
  Object.entries(distribution || {})
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 4);

const isCoordinatePair = (coords: unknown): coords is [number, number] =>
  Array.isArray(coords) && typeof coords[0] === "number" && typeof coords[1] === "number";

const toLatLng = (coordinates: unknown): [number, number] | null => {
  if (!isCoordinatePair(coordinates)) return null;
  const [lon, lat] = coordinates;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return [lat, lon];
};

const getGeoBounds = (geo: GeoJsonObject | null | undefined): [[number, number], [number, number]] | null => {
  if (!geo) return null;

  let minLat = 90;
  let minLon = 180;
  let maxLat = -90;
  let maxLon = -180;

  const visit = (coords: unknown) => {
    if (!coords) return;
    if (isCoordinatePair(coords)) {
      const [lon, lat] = coords;
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
      return;
    }
    if (Array.isArray(coords)) {
      coords.forEach(visit);
    }
  };

  if (geo.type === "FeatureCollection") {
    (geo as MapFeatureCollection).features.forEach((feature) => visit((feature.geometry as { coordinates?: unknown })?.coordinates));
  } else if (geo.type === "Feature") {
    visit(((geo as MapFeature).geometry as { coordinates?: unknown })?.coordinates);
  } else {
    visit((geo as { coordinates?: unknown }).coordinates);
  }

  if (minLat > maxLat || minLon > maxLon) return null;
  return [
    [minLat, minLon],
    [maxLat, maxLon],
  ];
};

const featureCenter = (feature: MapFeature): [number, number] | null => {
  const coords = (feature?.geometry as { coordinates?: unknown })?.coordinates;
  if (!coords) return null;
  if (feature.geometry.type === "Point") {
    const point = coords as [number, number];
    return [point[1], point[0]];
  }

  const ring =
    feature.geometry.type === "Polygon"
      ? (coords as number[][][])[0]
      : (coords as number[][][][])[0]?.[0];
  if (!Array.isArray(ring) || !ring.length) return null;

  let latSum = 0;
  let lonSum = 0;
  let count = 0;

  ring.forEach((pair: number[]) => {
    if (Array.isArray(pair) && pair.length >= 2) {
      lonSum += Number(pair[0]);
      latSum += Number(pair[1]);
      count += 1;
    }
  });

  if (!count) return null;
  return [latSum / count, lonSum / count];
};

const getQuantileThresholds = (counts: number[]) => {
  if (!counts.length) return [0, 0, 0, 0];
  const sorted = [...counts].sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.floor(p * (sorted.length - 1))] ?? 0;
  return [q(0.2), q(0.45), q(0.7), q(0.88)];
};

const getDistrictFill = (count: number, thresholds: number[]) => {
  const [t1, t2, t3, t4] = thresholds;
  if (count > t4) return "#dc2626";
  if (count > t3) return "#f97316";
  if (count > t2) return "#f59e0b";
  if (count > t1) return "#60a5fa";
  return "#dbeafe";
};

const getRiskTone = (crimeCount: number, maxCount: number) => {
  const ratio = maxCount > 0 ? crimeCount / maxCount : 0;
  if (ratio >= 0.8) return { color: "#dc2626", fill: "#f87171" };
  if (ratio >= 0.55) return { color: "#f59e0b", fill: "#fbbf24" };
  if (ratio >= 0.3) return { color: "#3b82f6", fill: "#60a5fa" };
  return { color: "#22c55e", fill: "#4ade80" };
};

const FitBounds = ({ bounds }: { bounds: [[number, number], [number, number]] | null }) => {
  const map = useMap();

  useEffect(() => {
    if (!bounds) return;
    map.fitBounds(bounds, { padding: [28, 28] });
  }, [bounds, map]);

  return null;
};

const MapThemeSync = ({ style }: { style: "street" | "satellite" }) => {
  const map = useMap();

  useEffect(() => {
    if (style === "street") {
      map.getContainer().style.filter = "saturate(0.95) contrast(1.02)";
      return;
    }

    map.getContainer().style.filter = "saturate(0.9) contrast(1.05)";
  }, [map, style]);

  return null;
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
  compact = false,
}: HotspotsMapProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapStyle, setMapStyle] = useState<"street" | "satellite">("street");

  const bounds = useMemo(
    () => getGeoBounds(districts) || getGeoBounds(stateBoundary) || BIHAR_BOUNDS,
    [districts, stateBoundary]
  );

  const districtCounts = useMemo(() => {
    if (!districts || districts.type !== "FeatureCollection") return [];
    return (districts as MapFeatureCollection).features.map((feature) =>
      Number(feature.properties?.crime_count || 0)
    );
  }, [districts]);

  const thresholds = useMemo(() => getQuantileThresholds(districtCounts), [districtCounts]);
  const stationCenters = useMemo(() => {
    if (!stations || stations.type !== "FeatureCollection") return [];
    return (stations as MapFeatureCollection).features
      .map((feature) => ({
        name: feature.properties?.name || "Station",
        center: featureCenter(feature),
      }))
      .filter((item: { center: [number, number] | null }) => Array.isArray(item.center));
  }, [stations]);

  const validHotspots = useMemo(
    () =>
      hotspots.filter((hotspot) => {
        const center = toLatLng(hotspot?.centroid?.coordinates);
        return Array.isArray(center);
      }),
    [hotspots]
  );

  const maxCount = useMemo(
    () => Math.max(...validHotspots.map((hotspot) => hotspot.crimeCount), 0),
    [validHotspots]
  );

  const selectedHotspot = useMemo(
    () => validHotspots.find((hotspot) => hotspot.clusterId === selectedHotspotId) || null,
    [validHotspots, selectedHotspotId]
  );

  const center: [number, number] =
    toLatLng(selectedHotspot?.centroid?.coordinates) ||
    toLatLng(validHotspots[0]?.centroid?.coordinates) ||
    BIHAR_CENTER;

  useEffect(() => {
    document.body.style.overflow = isFullscreen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
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
      <MapContainer center={center} zoom={7} minZoom={6} maxZoom={16} className="h-full w-full">
        {mapStyle === "street" ? (
          <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
        ) : (
          <>
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" />
          </>
        )}

        <FitBounds bounds={bounds} />
        <MapThemeSync style={mapStyle} />

        {stateBoundary ? (
          <GeoJSON
            data={stateBoundary}
            style={() => ({
              color: mapStyle === "street" ? "#1d4ed8" : "#f8fafc",
              weight: 2.4,
              opacity: 0.85,
              fillOpacity: 0,
            })}
          />
        ) : null}

        {districts ? (
          <GeoJSON
            data={districts}
            onEachFeature={(feature, layer) => {
              const districtFeature = feature as MapFeature;
              const name = districtFeature.properties?.name || "District";
              const count = Number(districtFeature.properties?.crime_count || 0);
              layer.bindTooltip(`${name} - ${count}`, {
                className: "station-label",
                direction: "center",
                opacity: 1,
              });
            }}
            style={(feature) => ({
              color: mapStyle === "street" ? "#94a3b8" : "#f8fafc",
              weight: 1.2,
              opacity: 0.7,
              fillOpacity: showDistrictShading ? 0.36 : 0.08,
              fillColor: getDistrictFill(
                Number((feature as MapFeature | undefined)?.properties?.crime_count || 0),
                thresholds
              ),
            })}
          />
        ) : null}

        {stationCenters.map((station) => (
          <CircleMarker
            key={station.name}
            center={station.center as [number, number]}
            radius={4}
            pathOptions={{
              color: "#f59e0b",
              weight: 2,
              fillColor: "#fff7ed",
              fillOpacity: 1,
            }}
          >
            <Popup>
              <div className="hotspot-popup">
                <div className="hotspot-popup-title">{station.name}</div>
                <div className="hotspot-popup-meta">Police station reference marker</div>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {mode === "dbscan" || mode === "both"
          ? validHotspots.map((hotspot) => {
              const centerPoint = toLatLng(hotspot.centroid.coordinates);
              if (!centerPoint) return null;
              const tone = getRiskTone(hotspot.crimeCount, maxCount);
              const selected = hotspot.clusterId === selectedHotspotId;
              const radius = Math.max(350, Math.min(1800, hotspot.crimeCount * 18));

              return (
                <Circle
                  key={hotspot.clusterId}
                  center={centerPoint}
                  radius={radius}
                  pathOptions={{
                    color: tone.color,
                    weight: selected ? 3.2 : 2.2,
                    opacity: selected ? 1 : 0.88,
                    fillColor: tone.fill,
                    fillOpacity: selected ? 0.26 : 0.18,
                  }}
                  eventHandlers={{
                    click: () => onSelectHotspot?.(hotspot.clusterId),
                  }}
                >
                  <Popup>
                    <div className="hotspot-popup">
                      <div className="hotspot-popup-title">{hotspot.clusterId}</div>
                      <div className="hotspot-popup-meta">
                        {hotspot.crimeCount} incidents inside the current hotspot radius
                      </div>
                      <div className="hotspot-popup-section">Top crime types</div>
                      {(summarizeDistribution(hotspot.crimeDistribution).length
                        ? summarizeDistribution(hotspot.crimeDistribution)
                        : [["No data", 0]]
                      ).map(([crimeType, count]) => (
                        <div key={`${hotspot.clusterId}-${crimeType}`} className="hotspot-popup-row">
                          <span>{crimeType}</span>
                          <strong>{count}</strong>
                        </div>
                      ))}
                    </div>
                  </Popup>
                </Circle>
              );
            })
          : null}

        {mode === "dbscan" || mode === "both"
          ? validHotspots.map((hotspot) => {
              const lat = hotspot.centroid.coordinates[1];
              const lon = hotspot.centroid.coordinates[0];
              
              // Skip if coordinates are invalid
              if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
              
              const centerPoint: [number, number] = [lat, lon];
              const tone = getRiskTone(hotspot.crimeCount, maxCount);
              const selected = hotspot.clusterId === selectedHotspotId;

              return (
                <CircleMarker
                  key={`${hotspot.clusterId}-core`}
                  center={centerPoint}
                  radius={selected ? 11 : 9}
                  pathOptions={{
                    color: "#ffffff",
                    weight: 3,
                    fillColor: tone.color,
                    fillOpacity: 1,
                  }}
                  eventHandlers={{
                    click: () => onSelectHotspot?.(hotspot.clusterId),
                  }}
                />
              );
            })
          : null}

        {mode === "kde" || mode === "both"
          ? heatPoints.map((pt, index) => {
              const intensity = Math.max(0.15, Math.min(1, pt.intensity));
              const color =
                intensity > 0.72 ? "#dc2626" : intensity > 0.45 ? "#f59e0b" : "#3b82f6";

              return (
                <Circle
                  key={`heat-${index}`}
                  center={[pt.lat, pt.lon]}
                  radius={240 + intensity * 920}
                  pathOptions={{
                    color,
                    weight: 0,
                    fillColor: color,
                    fillOpacity: 0.12 + intensity * 0.12,
                  }}
                />
              );
            })
          : null}

        {womenHeatPoints.map((pt, index) => (
          <Circle
            key={`women-${index}`}
            center={[pt.lat, pt.lon]}
            radius={210 + Math.min(1, pt.intensity) * 760}
            pathOptions={{
              color: "#db2777",
              weight: 0,
              fillColor: "#ec4899",
              fillOpacity: 0.16,
            }}
          />
        ))}

        {accidentHeatPoints.map((pt, index) => (
          <Circle
            key={`accident-${index}`}
            center={[pt.lat, pt.lon]}
            radius={190 + Math.min(1, pt.intensity) * 720}
            pathOptions={{
              color: "#0ea5e9",
              weight: 0,
              fillColor: "#38bdf8",
              fillOpacity: 0.14,
            }}
          />
        ))}
      </MapContainer>

      <div className={`map-panel absolute left-5 top-5 z-[1000] ${compact ? "flex" : "hidden md:flex"} items-center gap-2 rounded-2xl px-3 py-2 text-xs font-medium text-[var(--fg-secondary)]`}>
        <button
          type="button"
          onClick={() => setMapStyle("street")}
          className={`rounded-xl px-3 py-1.5 ${mapStyle === "street" ? "bg-[var(--accent-50)] text-[var(--accent-700)]" : ""}`}
        >
          Street
        </button>
        <button
          type="button"
          onClick={() => setMapStyle("satellite")}
          className={`rounded-xl px-3 py-1.5 ${mapStyle === "satellite" ? "bg-[var(--accent-50)] text-[var(--accent-700)]" : ""}`}
        >
          Satellite
        </button>
        <span className="h-4 w-px bg-[var(--border-default)]" />
        <span>
          {mode === "dbscan"
            ? "Cluster mode"
            : mode === "kde"
              ? "Heatmap mode"
              : "Combined mode"}
        </span>
      </div>

      {!compact ? (
        <div className="absolute right-5 top-5 z-[1000] flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setIsFullscreen((prev) => !prev)}
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

      <div className={`map-panel absolute ${compact ? "bottom-4 left-4" : "bottom-5 left-5"} z-[1000] rounded-[20px] px-4 py-3 text-xs text-[var(--fg-secondary)]`}>
        <div className="mb-2 font-semibold text-[var(--fg-primary)]">Risk legend</div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#22c55e]" />
            Low
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#3b82f6]" />
            Elevated
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
            High
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#dc2626]" />
            Critical
          </div>
        </div>
      </div>
    </div>
  );
}
