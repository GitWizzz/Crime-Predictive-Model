"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { CircleMarker, GeoJSON, Popup, TileLayer, useMap } from "react-leaflet";

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);

const INDIA_CENTER = [20.5937, 78.9629];
const BIHAR_CENTER: [number, number] = [25.6, 85.2];
const BIHAR_BOUNDS: [[number, number], [number, number]] = [
  [24.3, 83.2],
  [27.5, 88.5],
];

const getColor = (count: number) => {
  if (count >= 30) return "#991b1b";
  if (count >= 15) return "#ea580c";
  if (count >= 5) return "#16a34a";
  return "#0ea5e9";
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
  const quantiles = useMemo(() => getQuantileThresholds(districtCounts), [districtCounts]);
  const legendStops = useMemo(() => getLegendStops(Math.max(...districtCounts, 0)), [districtCounts]);
  const center = hotspots?.length
    ? [hotspots[0].centroid.coordinates[1], hotspots[0].centroid.coordinates[0]]
    : bounds
      ? [(bounds[0][0] + bounds[1][0]) / 2, (bounds[0][1] + bounds[1][1]) / 2]
      : BIHAR_CENTER ?? INDIA_CENTER;

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
            data={districts as any}
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
          <GeoJSON data={districts as any} style={() => districtBorderStyle} />
        )}

        {stations && (
          <GeoJSON
            data={stations as any}
            onEachFeature={(feature, layer) => {
              const name = (feature as any).properties?.name || "Station";
              layer.bindTooltip(name, {
                permanent: true,
                direction: "center",
                className: "station-label",
                interactive: false,
              });
            }}
            style={() => ({
              color: "#fbbf24",
              weight: 2,
              fillOpacity: 0,
            })}
          />
        )}

        {mode === "dbscan" &&
          hotspots.map((hotspot) => (
            <GeoJSON
              key={hotspot.clusterId}
              data={
                {
                  type: "Feature",
                  geometry: hotspot.boundary,
                  properties: {
                    crimeDistribution: hotspot.crimeDistribution,
                    crimeCount: hotspot.crimeCount,
                  },
                } as any
              }
              onEachFeature={(feature, layer) => {
                const dist = (feature as any).properties?.crimeDistribution || {};
                const entries = Object.entries(dist);
                const lines = entries.length
                  ? entries.map(([type, count]) => `${type}: ${count}`).join("<br/>")
                  : "No crime types";
                layer.bindTooltip(
                  `<div><strong>Crime Types</strong><br/>${lines}</div>`,
                  { sticky: true }
                );
              }}
              style={{
                color: getColor(hotspot.crimeCount),
                weight: 2,
                fillOpacity: 0.15,
              }}
            />
          ))}

        {mode === "dbscan" &&
          hotspots.map((hotspot) => (
            <CircleMarker
              key={`${hotspot.clusterId}-center`}
              center={[
                hotspot.centroid.coordinates[1],
                hotspot.centroid.coordinates[0],
              ]}
              radius={6}
              pathOptions={{ color: getColor(hotspot.crimeCount) }}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{hotspot.clusterId}</div>
                  <div>Crimes: {hotspot.crimeCount}</div>
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
          className="rounded-md border bg-white/90 px-3 py-1 text-xs font-medium text-zinc-700 shadow hover:bg-white"
        >
          {mapStyle === "satellite" ? "Street" : "Satellite"}
        </button>
        <button
          type="button"
          onClick={() => setIsFullscreen((prev) => !prev)}
          className="rounded-md border bg-white/90 px-3 py-1 text-xs font-medium text-zinc-700 shadow hover:bg-white"
        >
          {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        </button>
      </div>

      {(showDistrictShading || stations) && (
        <div className="pointer-events-none absolute bottom-4 right-4 rounded-lg border bg-white/90 px-3 py-2 text-xs text-zinc-700 shadow">
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
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded border"
                  style={{ backgroundColor: "#fff", borderColor: "#fbbf24" }}
                />
                <span>Station boundary</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
