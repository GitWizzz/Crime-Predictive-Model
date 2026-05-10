"use client";

import { useEffect, useRef, useState } from "react";
import { GeoJSON, MapContainer, TileLayer, ZoomControl, useMap } from "react-leaflet";
import type { FeatureCollection, GeoJsonObject } from "geojson";

const STADIA = "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png";
const BIHAR_CENTER: [number, number] = [25.6, 85.2];
const BIHAR_BOUNDS: [[number, number], [number, number]] = [[24.3, 83.2], [27.5, 88.5]];

export type GeoFence = {
  id: number;
  name: string;
  type: string;
  boundary: GeoJsonObject | null;
  alert_radius_m: number;
  active: boolean;
};

type Props = {
  fences: GeoFence[];
  selectedId?: number | null;
  onFenceClick?: (fence: GeoFence) => void;
  districts?: GeoJsonObject | null;
  stateBoundary?: GeoJsonObject | null;
};

const TYPE_COLOR: Record<string, { fill: string; stroke: string }> = {
  SCHOOL:     { fill: "#dbeafe", stroke: "#3b82f6" },
  GOVERNMENT: { fill: "#fce7f3", stroke: "#ec4899" },
  MARKET:     { fill: "#fef9c3", stroke: "#eab308" },
  HOSPITAL:   { fill: "#dcfce7", stroke: "#22c55e" },
  TRANSIT:    { fill: "#f3e8ff", stroke: "#a855f7" },
  RELIGIOUS:  { fill: "#fff7ed", stroke: "#f97316" },
  BORDER:     { fill: "#f1f5f9", stroke: "#64748b" },
  CUSTOM:     { fill: "#f0fdf4", stroke: "#15803d" },
  OTHER:      { fill: "#f1f5f9", stroke: "#94a3b8" },
};

function polygonBounds(boundary: GeoJsonObject | null): [[number, number], [number, number]] | null {
  try {
    if (!boundary) return null;
    const geo = boundary as any;
    let coords: [number, number][] = [];
    if (geo.type === "Polygon" && Array.isArray(geo.coordinates?.[0])) {
      coords = geo.coordinates[0];
    } else if (geo.type === "MultiPolygon") {
      for (const ring of geo.coordinates) {
        for (const part of ring) coords.push(...part);
      }
    }
    if (coords.length < 3) return null;
    const lats = coords.map((c: [number, number]) => c[1]);
    const lons = coords.map((c: [number, number]) => c[0]);
    return [
      [Math.min(...lats), Math.min(...lons)],
      [Math.max(...lats), Math.max(...lons)],
    ];
  } catch { return null; }
}

/** Returns true when a polygon is a plain axis-aligned bounding box (4 unique corners). */
function isSimpleBbox(boundary: GeoJsonObject | null): boolean {
  if (!boundary) return false;
  const geo = boundary as any;
  if (geo.type !== "Polygon") return false;
  const ring: number[][] = geo.coordinates?.[0];
  if (!ring || ring.length !== 5) return false;
  const uniqueLats = new Set(ring.slice(0, 4).map(c => c[1]));
  const uniqueLons = new Set(ring.slice(0, 4).map(c => c[0]));
  return uniqueLats.size === 2 && uniqueLons.size === 2;
}

/** Centroid of a bbox polygon as [lat, lon]. */
function bboxCentroid(boundary: GeoJsonObject): [number, number] {
  const ring = (boundary as any).coordinates[0] as number[][];
  const lats = ring.slice(0, 4).map(c => c[1]);
  const lons = ring.slice(0, 4).map(c => c[0]);
  return [
    (Math.min(...lats) + Math.max(...lats)) / 2,
    (Math.min(...lons) + Math.max(...lons)) / 2,
  ];
}

/** Build a smooth 48-point GeoJSON circle polygon. */
function circlePolygon(lat: number, lon: number, radiusM: number): GeoJsonObject {
  const dLat = radiusM / 111000;
  const dLon = radiusM / (111000 * Math.cos((lat * Math.PI) / 180));
  const pts: [number, number][] = [];
  const steps = 48;
  for (let i = 0; i <= steps; i++) {
    const θ = (i * 2 * Math.PI) / steps;
    pts.push([
      parseFloat((lon + dLon * Math.sin(θ)).toFixed(6)),
      parseFloat((lat + dLat * Math.cos(θ)).toFixed(6)),
    ]);
  }
  return { type: "Polygon", coordinates: [pts] } as unknown as GeoJsonObject;
}

/** Return the best renderable boundary for a fence. */
function effectiveBoundary(fence: GeoFence): GeoJsonObject | null {
  if (!fence.boundary) return null;
  if (isSimpleBbox(fence.boundary)) {
    const [lat, lon] = bboxCentroid(fence.boundary);
    return circlePolygon(lat, lon, fence.alert_radius_m);
  }
  return fence.boundary;
}

const FitBounds = () => {
  const map = useMap();
  useEffect(() => { map.fitBounds(BIHAR_BOUNDS, { padding: [28, 28] }); }, [map]);
  return null;
};

const FlyToFence = ({ fences, selectedId }: { fences: GeoFence[]; selectedId: number | null | undefined }) => {
  const map = useMap();
  const prevId = useRef<number | null | undefined>(null);

  useEffect(() => {
    if (!selectedId || selectedId === prevId.current) return;
    prevId.current = selectedId;
    const fence = fences.find(f => f.id === selectedId);
    if (!fence) return;
    const bounds = polygonBounds(effectiveBoundary(fence));
    if (bounds) {
      map.flyToBounds(bounds, { padding: [60, 60], duration: 0.7 });
    }
  }, [selectedId, fences, map]);

  return null;
};

const DISTRICT_STYLE = {
  color: "#93c5fd", weight: 1, opacity: 0.6,
  fillColor: "#f8fafc", fillOpacity: 0.18,
};

export default function GeoFenceMap({ fences, selectedId, onFenceClick, districts, stateBoundary }: Props) {
  const [staticGeo, setStaticGeo] = useState<FeatureCollection | null>(null);
  useEffect(() => {
    fetch("/bihar_districts.geojson").then(r => r.json()).then(setStaticGeo).catch(() => {});
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[28px] border shadow-(--shadow-md)">
      <MapContainer center={BIHAR_CENTER} zoom={7} minZoom={6} maxZoom={18} className="h-full w-full" zoomControl={false}>
        <TileLayer url={STADIA} attribution='&copy; Stadia Maps' />
        <FitBounds />
        <FlyToFence fences={fences} selectedId={selectedId} />

        {stateBoundary && (
          <GeoJSON data={stateBoundary} style={() => ({ color: "#60a5fa", weight: 1.5, opacity: 0.5, fillOpacity: 0 })} />
        )}

        {staticGeo && (
          <GeoJSON key="districts-static" data={staticGeo} style={() => DISTRICT_STYLE} />
        )}

        {/* Render each fence as a smooth circular area or true polygon */}
        {fences.map(fence => {
          const geo = effectiveBoundary(fence);
          if (!geo) return null;
          const tone = TYPE_COLOR[fence.type] || TYPE_COLOR.OTHER;
          const isSelected = fence.id === selectedId;
          const active = fence.active;

          const feature = {
            type: "Feature" as const,
            properties: { name: fence.name, type: fence.type },
            geometry: geo,
          };

          return (
            <GeoJSON
              key={`fence-${fence.id}-${isSelected}-${active}`}
              data={feature}
              style={() => ({
                color: tone.stroke,
                weight: isSelected ? 3 : 1.5,
                opacity: active ? 0.9 : 0.4,
                fillColor: tone.fill,
                fillOpacity: isSelected ? 0.55 : (active ? 0.28 : 0.08),
                dashArray: active ? undefined : "6 4",
              })}
              onEachFeature={(_, layer) => {
                layer.on("click", () => onFenceClick?.(fence));
                (layer as any).bindTooltip(
                  `<div style="font-size:12px;font-weight:700;color:${tone.stroke}">${fence.name}</div>` +
                  `<div style="font-size:10px;color:#6b7280">${fence.type} · radius ${fence.alert_radius_m}m</div>` +
                  (!active ? `<div style="font-size:10px;color:#dc2626">Inactive</div>` : ""),
                  { className: "cluster-tip", sticky: true }
                );
              }}
            />
          );
        })}

        <ZoomControl position="bottomright" />
      </MapContainer>

      {/* Type legend */}
      <div style={{ position: "absolute", bottom: 20, left: 16, zIndex: 1000, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(12px)", borderRadius: 16, border: "1px solid #e2e8f0", padding: "12px 14px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Fence types</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {(["SCHOOL", "HOSPITAL", "GOVERNMENT", "RELIGIOUS", "BORDER", "CUSTOM"] as const).map((type) => (
            <div key={type} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: TYPE_COLOR[type].fill, border: `2px solid ${TYPE_COLOR[type].stroke}`, display: "inline-block" }} />
              <span style={{ fontSize: 10, color: "#374151", fontWeight: 600 }}>{type}</span>
            </div>
          ))}
        </div>
      </div>

      {fences.length === 0 && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, pointerEvents: "none" }}>
          <div style={{ background: "rgba(255,255,255,0.9)", borderRadius: 14, padding: "12px 20px", fontSize: 13, color: "#64748b", border: "1px solid #e4e7eb" }}>
            No geo-fences defined yet
          </div>
        </div>
      )}
    </div>
  );
}
