"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Circle, CircleMarker, GeoJSON, Popup, Rectangle, TileLayer, useMap } from "react-leaflet";

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);

const INDIA_CENTER: [number, number] = [20.5937, 78.9629];
const BIHAR_CENTER: [number, number] = [25.6, 85.2];
const BIHAR_BOUNDS: [[number, number], [number, number]] = [
  [24.3, 83.2],
  [27.5, 88.5],
];

const crimeDotPalette = [
  "#22c55e",
  "#0ea5e9",
  "#f97316",
  "#a855f7",
  "#eab308",
  "#ef4444",
];

const summarizeDistribution = (distribution?: Record<string, number>) => {
  const entries = Object.entries(distribution || {}).sort(
    (a, b) => Number(b[1]) - Number(a[1])
  );
  const top = entries.slice(0, 4);
  return {
    totalTypes: entries.length,
    top,
  };
};

const metersToLat = (meters: number) => meters / 111320;
const metersToLon = (meters: number, lat: number) =>
  meters / (111320 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));

const getClusterBoxBounds = (
  centroid: [number, number],
  crimeCount: number
): [[number, number], [number, number]] => {
  const [lat, lon] = centroid;
  const halfSideM = Math.min(1200, Math.max(250, crimeCount * 35));
  const dLat = metersToLat(halfSideM);
  const dLon = metersToLon(halfSideM, lat);
  return [
    [lat - dLat, lon - dLon],
    [lat + dLat, lon + dLon],
  ];
};

const generateClusterDots = (
  centroid: [number, number],
  crimeCount: number,
  distribution?: Record<string, number>
) => {
  const entries = Object.entries(distribution || {}).sort(
    (a, b) => Number(b[1]) - Number(a[1])
  );
  const total = entries.reduce((acc, [, count]) => acc + Number(count || 0), 0);
  const maxDots = 24;
  const scale = total > maxDots ? maxDots / total : 1;
  const points: Array<{ lat: number; lon: number; color: string; key: string }> = [];
  const [baseLat, baseLon] = centroid;
  const spreadMeters = Math.min(700, Math.max(180, crimeCount * 22));
  const stepMeters = Math.max(70, spreadMeters / 4);

  let idx = 0;
  const dotPlan: Array<{ crimeType: string; color: string; key: string }> = [];
  entries.forEach(([crimeType, count], crimeIdx) => {
    const n = Math.max(1, Math.round(Number(count || 0) * scale));
    for (let i = 0; i < n; i++) {
      dotPlan.push({
        crimeType,
        color: crimeDotPalette[crimeIdx % crimeDotPalette.length],
        key: `${crimeType}-${idx}`,
      });
      idx++;
    }
  });

  const cols = Math.max(2, Math.ceil(Math.sqrt(dotPlan.length)));
  const rows = Math.max(2, Math.ceil(dotPlan.length / cols));

  dotPlan.forEach((dot, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const x = (col - (cols - 1) / 2) * stepMeters;
    const y = (row - (rows - 1) / 2) * stepMeters;
    const jitterX = Math.sin((index + 1) * 2.17) * (stepMeters * 0.2);
    const jitterY = Math.cos((index + 1) * 1.73) * (stepMeters * 0.2);
    const lat = baseLat + metersToLat(y + jitterY);
    const lon = baseLon + metersToLon(x + jitterX, baseLat);
    points.push({
      lat,
      lon,
      color: dot.color,
      key: dot.key,
    });
  });

  return points;
};

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

type HotspotsMapProps = {
  mode: "dbscan" | "kde";
  hotspots: Hotspot[];
  heatPoints: HeatPoint[];
  womenHeatPoints?: HeatPoint[];
  accidentHeatPoints?: HeatPoint[];
  districts?: any | null;
  stateBoundary?: any | null;
  stations?: any | null;
  showDistrictShading?: boolean;
};

const getGeoBounds = (geo: any): [[number, number], [number, number]] | null => {
  if (!geo) return null;
  let minLat = 90;
  let minLon = 180;
  let maxLat = -90;
  let maxLon = -180;

  const visit = (coords: any) => {
    if (!coords) return;
    if (typeof coords[0] === "number") {
      const [lon, lat] = coords;
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
      return;
    }
    coords.forEach(visit);
  };

  if (geo.type === "FeatureCollection") {
    geo.features?.forEach((feature: any) => visit(feature.geometry?.coordinates));
  } else if (geo.type === "Feature") {
    visit(geo.geometry?.coordinates);
  } else {
    visit(geo.coordinates);
  }

  if (minLat > maxLat || minLon > maxLon) {
    return null;
  }
  return [
    [minLat, minLon],
    [maxLat, maxLon],
  ];
};

const featureCenter = (feature: any): [number, number] | null => {
  const coords = feature?.geometry?.coordinates;
  if (!coords) return null;
  if (feature.geometry.type === "Point") {
    return [coords[1], coords[0]];
  }
  const ring = feature.geometry.type === "Polygon" ? coords?.[0] : coords?.[0]?.[0];
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

const isAxisAlignedRectangle = (geometry: any) => {
  if (!geometry || geometry.type !== "Polygon") return false;
  const ring = geometry.coordinates?.[0];
  if (!Array.isArray(ring) || ring.length < 5) return false;
  const points = ring.slice(0, 4);
  if (points.length !== 4) return false;
  const uniqueLats = new Set(points.map((p: number[]) => Number(p[1]).toFixed(6)));
  const uniqueLons = new Set(points.map((p: number[]) => Number(p[0]).toFixed(6)));
  return uniqueLats.size === 2 && uniqueLons.size === 2;
};

const hashSeed = (text: string) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const rectangleToAreaPolygon = (geometry: any, label: string) => {
  const ring = geometry?.coordinates?.[0];
  if (!Array.isArray(ring) || ring.length < 4) return geometry;
  const lons = ring.map((p: number[]) => Number(p[0]));
  const lats = ring.map((p: number[]) => Number(p[1]));
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const cLon = (minLon + maxLon) / 2;
  const cLat = (minLat + maxLat) / 2;
  const rx = (maxLon - minLon) / 2;
  const ry = (maxLat - minLat) / 2;
  const seed = hashSeed(label || "district");
  const phase = (seed % 360) * (Math.PI / 180);
  const points: number[][] = [];

  const segments = 28;
  for (let i = 0; i < segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const wobble1 = 0.08 * Math.sin(3 * t + phase);
    const wobble2 = 0.06 * Math.cos(5 * t + phase * 0.7);
    const stretch = 0.88 + wobble1 + wobble2;
    points.push([
      cLon + rx * stretch * Math.cos(t),
      cLat + ry * stretch * Math.sin(t),
    ]);
  }
  points.push(points[0]);

  return {
    type: "Polygon",
    coordinates: [points],
  };
};

const FitBounds = ({ bounds }: { bounds: [[number, number], [number, number]] | null }) => {
  const map = useMap();

  useEffect(() => {
    if (!bounds) return;
    map.fitBounds(bounds, { padding: [12, 12] });
  }, [bounds, map]);

  return null;
};

const getLegendStops = (maxCount: number) => {
  if (!maxCount) {
    return [
      { label: "0", color: "#f0fdf4" },
      { label: "1-5", color: "#dcfce7" },
      { label: "6-10", color: "#bbf7d0" },
      { label: "11-25", color: "#86efac" },
      { label: "26+", color: "#4ade80" },
    ];
  }

  return [
    { label: `0-${Math.max(1, Math.round(maxCount * 0.1))}`, color: "#f0fdf4" },
    { label: `${Math.round(maxCount * 0.1) + 1}-${Math.round(maxCount * 0.25)}`, color: "#dcfce7" },
    { label: `${Math.round(maxCount * 0.25) + 1}-${Math.round(maxCount * 0.5)}`, color: "#bbf7d0" },
    { label: `${Math.round(maxCount * 0.5) + 1}-${Math.round(maxCount * 0.75)}`, color: "#86efac" },
    { label: `${Math.round(maxCount * 0.75) + 1}+`, color: "#4ade80" },
  ];
};

const getQuantileThresholds = (counts: number[]) => {
  if (!counts.length) return [0, 0, 0, 0];
  const sorted = [...counts].sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.floor(p * (sorted.length - 1))] ?? 0;
  return [q(0.2), q(0.4), q(0.6), q(0.8)];
};

const pickFillColor = (count: number, thresholds: number[]) => {
  const [t1, t2, t3, t4] = thresholds;
  if (count > t4) return "#4ade80";
  if (count > t3) return "#86efac";
  if (count > t2) return "#bbf7d0";
  if (count > t1) return "#dcfce7";
  return "#f0fdf4";
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
}: HotspotsMapProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapStyle, setMapStyle] = useState<"satellite" | "street">("satellite");
  const bounds = useMemo(
    () => getGeoBounds(districts) || getGeoBounds(stateBoundary) || BIHAR_BOUNDS,
    [districts, stateBoundary]
  );
  const districtBorderStyle = useMemo(
    () => ({
      color: mapStyle === "satellite" ? "#f8fafc" : "#22c55e",
      weight: mapStyle === "satellite" ? 1.5 : 1.2,
      opacity: 0.9,
      fillOpacity: 0,
    }),
    [mapStyle]
  );
  const districtCounts = useMemo(() => {
    if (!districts?.features?.length) return [];
    return districts.features.map((feature: any) => feature?.properties?.crime_count || 0);
  }, [districts]);
  const districtDisplayGeo = useMemo(() => {
    if (!districts?.features?.length) return districts;
    return {
      ...districts,
      features: districts.features.map((feature: any) => {
        const geometry = feature?.geometry;
        if (!isAxisAlignedRectangle(geometry)) return feature;
        const name = feature?.properties?.name || "District";
        return {
          ...feature,
          geometry: rectangleToAreaPolygon(geometry, name),
        };
      }),
    };
  }, [districts]);
  const quantiles = useMemo(() => getQuantileThresholds(districtCounts), [districtCounts]);
  const legendStops = useMemo(() => getLegendStops(Math.max(...districtCounts, 0)), [districtCounts]);
  const stationCenters = useMemo(() => {
    if (!stations?.features?.length) return [];
    return stations.features
      .map((feature: any) => ({
        name: feature?.properties?.name || "Station",
        center: featureCenter(feature),
      }))
      .filter((s: any) => Array.isArray(s.center));
  }, [stations]);
  const center: [number, number] = hotspots?.length
    ? [hotspots[0].centroid.coordinates[1], hotspots[0].centroid.coordinates[0]]
    : bounds
      ? [(bounds[0][0] + bounds[1][0]) / 2, (bounds[0][1] + bounds[1][1]) / 2]
      : BIHAR_CENTER || INDIA_CENTER;

  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFullscreen]);

  return (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-50 bg-white dark:bg-zinc-900"
          : "relative h-[70vh] w-full overflow-hidden rounded-lg border"
      }
    >
      <MapContainer
        center={center}
        zoom={7}
        minZoom={2}
        maxZoom={18}
        className="h-full w-full"
      >
        {mapStyle === "satellite" ? (
          <>
            <TileLayer
              attribution="Tiles &copy; Esri"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
            <TileLayer
              attribution="Labels &copy; Esri"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            />
          </>
        ) : (
          <TileLayer
            attribution='&copy; OpenStreetMap contributors &copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
        )}

        <FitBounds bounds={bounds} />

        {showDistrictShading && districts && (
          <GeoJSON
            data={districtDisplayGeo as any}
            style={(feature: any) => ({
              color: "transparent",
              weight: 0,
              fillOpacity: 0.45,
              fillColor: pickFillColor(feature?.properties?.crime_count || 0, quantiles),
              opacity: 0,
            })}
          />
        )}

        {districts && (
          <GeoJSON
            data={districtDisplayGeo as any}
            onEachFeature={(feature, layer) => {
              const name = (feature as any)?.properties?.name || "District";
              const count = Number((feature as any)?.properties?.crime_count || 0);
              layer.bindTooltip(`${name} (${count})`, {
                direction: "center",
                className: "station-label",
                opacity: 0.95,
              });
            }}
            style={() => ({
              ...districtBorderStyle,
              color: "#f8fafc",
              weight: 2,
              opacity: 0.95,
              fillColor: "#ffffff",
              fillOpacity: 0.05,
            })}
          />
        )}

        {stationCenters.map((station: any) => (
          <Circle
            key={`station-area-${station.name}`}
            center={station.center}
            radius={850}
            pathOptions={{
              color: "#fbbf24",
              weight: 2,
              fillOpacity: 0,
              dashArray: "6 4",
            }}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">{station.name}</div>
                <div className="text-zinc-400">Station service area</div>
              </div>
            </Popup>
          </Circle>
        ))}

        {mode === "dbscan" &&
          hotspots.map((hotspot) => (
            <Rectangle
              key={`${hotspot.clusterId}-box`}
              bounds={getClusterBoxBounds(
                [hotspot.centroid.coordinates[1], hotspot.centroid.coordinates[0]],
                hotspot.crimeCount
              )}
              pathOptions={{
                color: "#b91c1c",
                weight: 2.2,
                fillOpacity: 0.04,
                fillColor: "#ef4444",
              }}
            >
              <Popup>
                <div className="hotspot-popup">
                  <div className="hotspot-popup-title">{hotspot.clusterId}</div>
                  <div className="hotspot-popup-meta">
                    Total crimes: <strong>{hotspot.crimeCount}</strong>
                  </div>
                  <div className="hotspot-popup-section">Top crime types</div>
                  {(summarizeDistribution(hotspot.crimeDistribution).top.length
                    ? summarizeDistribution(hotspot.crimeDistribution).top
                    : [["No data", 0]]
                  ).map(([crimeType, count]) => (
                    <div key={`${hotspot.clusterId}-${crimeType}`} className="hotspot-popup-row">
                      <span>{crimeType}</span>
                      <strong>{count}</strong>
                    </div>
                  ))}
                </div>
              </Popup>
            </Rectangle>
          ))}

        {mode === "dbscan" &&
          hotspots.flatMap((hotspot) => {
            const centroid: [number, number] = [
              hotspot.centroid.coordinates[1],
              hotspot.centroid.coordinates[0],
            ];
            return generateClusterDots(
              centroid,
              hotspot.crimeCount,
              hotspot.crimeDistribution
            ).map((pt) => (
              <CircleMarker
                key={`${hotspot.clusterId}-dot-${pt.key}`}
                center={[pt.lat, pt.lon]}
                radius={5}
                pathOptions={{
                  color: pt.color,
                  weight: 2,
                  fillColor: "#ffffff",
                  fillOpacity: 0.9,
                }}
              />
            ));
          })}

        {mode === "dbscan" &&
          hotspots.map((hotspot) => (
            <CircleMarker
              key={`${hotspot.clusterId}-center`}
              center={[
                hotspot.centroid.coordinates[1],
                hotspot.centroid.coordinates[0],
              ]}
              radius={4}
              pathOptions={{
                color: "#b91c1c",
                weight: 2.5,
                fillColor: "#fee2e2",
                fillOpacity: 1,
              }}
            >
              <Popup>
                <div className="hotspot-popup">
                  <div className="hotspot-popup-title">{hotspot.clusterId}</div>
                  <div className="hotspot-popup-meta">
                    Total crimes: <strong>{hotspot.crimeCount}</strong>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}

        {mode === "kde" &&
          heatPoints.map((pt, idx) => (
            <CircleMarker
              key={`heat-${idx}`}
              center={[pt.lat, pt.lon]}
              radius={Math.min(18, 4 + pt.intensity * 12)}
              pathOptions={{ color: "#dc2626", fillOpacity: 0.2 }}
            />
          ))}

        {womenHeatPoints.map((pt, idx) => (
          <CircleMarker
            key={`women-heat-${idx}`}
            center={[pt.lat, pt.lon]}
            radius={Math.min(16, 4 + pt.intensity * 10)}
            pathOptions={{ color: "#ec4899", fillOpacity: 0.25 }}
          />
        ))}

        {accidentHeatPoints.map((pt, idx) => (
          <CircleMarker
            key={`accident-heat-${idx}`}
            center={[pt.lat, pt.lon]}
            radius={Math.min(16, 4 + pt.intensity * 10)}
            pathOptions={{ color: "#0ea5e9", fillOpacity: 0.25 }}
          />
        ))}
      </MapContainer>

      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2">
        <button
          type="button"
          onClick={() =>
            setMapStyle((prev) => (prev === "satellite" ? "street" : "satellite"))
          }
          className="rounded-md border bg-white/90 px-3 py-1 text-xs font-medium text-zinc-700 shadow hover:bg-white dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          {mapStyle === "satellite" ? "Street" : "Satellite"}
        </button>
        <button
          type="button"
          onClick={() => setIsFullscreen((prev) => !prev)}
          className="rounded-md border bg-white/90 px-3 py-1 text-xs font-medium text-zinc-700 shadow hover:bg-white dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        </button>
      </div>

      {(showDistrictShading || stations) && (
        <div className="pointer-events-none absolute bottom-4 right-4 rounded-lg border bg-white/90 px-3 py-2 text-xs text-zinc-700 shadow dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-200">
          {showDistrictShading && (
            <>
              <div className="font-semibold mb-2">District Crime Legend</div>
              <div className="space-y-1">
                {legendStops.map((stop) => (
                  <div key={stop.label} className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded"
                      style={{ backgroundColor: stop.color }}
                    />
                    <span>{stop.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          {stations && (
            <div className={showDistrictShading ? "mt-3 border-t pt-2" : ""}>
              <div className="font-semibold mb-1">Police Stations</div>
              <div className="text-[11px] text-zinc-500">Station boundary (amber outline)</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
