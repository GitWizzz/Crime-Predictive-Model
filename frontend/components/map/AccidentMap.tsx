"use client";

import { useEffect, useState } from "react";
import { Circle, GeoJSON, MapContainer, TileLayer, Tooltip, ZoomControl, useMap } from "react-leaflet";
import type { FeatureCollection, GeoJsonObject } from "geojson";

const STADIA = "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png";
const BIHAR_CENTER: [number, number] = [25.6, 85.2];
const BIHAR_BOUNDS: [[number, number], [number, number]] = [[24.3, 83.2], [27.5, 88.5]];

type HeatPoint = { lat: number; lon: number; intensity: number };

type Props = {
  heatPoints: HeatPoint[];
  districts?: GeoJsonObject | null;
  stateBoundary?: GeoJsonObject | null;
  districtCounts?: Record<string, number>;
};

const FitBounds = () => {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(BIHAR_BOUNDS, { padding: [28, 28] });
  }, [map]);
  return null;
};

const RAMP = [
  { threshold: 0.7, color: "#dc2626", label: "Fatal" },
  { threshold: 0.4, color: "#f97316", label: "Grievous" },
  { threshold: 0,   color: "#fbbf24", label: "Minor" },
];

const heatColor = (intensity: number) => {
  for (const { threshold, color } of RAMP) {
    if (intensity >= threshold) return color;
  }
  return "#fbbf24";
};

const DISTRICT_RAMP = ["#fffbeb", "#fde68a", "#fbbf24", "#f97316", "#dc2626"];

const choroplethColor = (count: number, max: number) => {
  if (max === 0) return DISTRICT_RAMP[0];
  const ratio = count / max;
  const idx = Math.min(4, Math.floor(ratio * 5));
  return DISTRICT_RAMP[idx];
};

export default function AccidentMap({ heatPoints, districts, stateBoundary, districtCounts = {} }: Props) {
  const [staticGeo, setStaticGeo] = useState<FeatureCollection | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<{ name: string; count: number } | null>(null);

  useEffect(() => {
    fetch("/bihar_districts.geojson").then(r => r.json()).then(setStaticGeo).catch(() => {});
  }, []);

  const maxCount = Math.max(...Object.values(districtCounts), 1);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[28px] border shadow-[var(--shadow-md)]">
      <MapContainer center={BIHAR_CENTER} zoom={7} minZoom={6} maxZoom={14} className="h-full w-full" zoomControl={false}>
        <TileLayer url={STADIA} attribution='&copy; Stadia Maps' />
        <FitBounds />

        {stateBoundary && (
          <GeoJSON data={stateBoundary} style={() => ({ color: "#60a5fa", weight: 2, opacity: 0.5, fillOpacity: 0 })} />
        )}

        {staticGeo && (
          <GeoJSON
            key={JSON.stringify(districtCounts)}
            data={staticGeo}
            onEachFeature={(feature, layer) => {
              const name = feature.properties?.name || "";
              const count = districtCounts[name.toLowerCase()] ?? 0;
              const fill = choroplethColor(count, maxCount);
              const baseStyle = { color: "#93c5fd", weight: 1, opacity: 0.7, fillColor: fill, fillOpacity: 0.35 };
              const hoverStyle = { ...baseStyle, color: "#60a5fa", weight: 2.2, fillOpacity: 0.55 };
              (layer as any).on("mouseover", () => (layer as any).setStyle(hoverStyle));
              (layer as any).on("mouseout",  () => (layer as any).setStyle(baseStyle));
              (layer as any).on("click", () => setSelectedDistrict({ name, count }));
            }}
            style={(feature) => {
              const count = districtCounts[(feature?.properties?.name || "").toLowerCase()] ?? 0;
              return { color: "#93c5fd", weight: 1, opacity: 0.7, fillColor: choroplethColor(count, maxCount), fillOpacity: 0.35 };
            }}
          />
        )}

        {heatPoints.map((pt, i) => {
          const intensity = Math.max(0.1, Math.min(1, pt.intensity));
          return (
            <Circle
              key={`a-${i}`}
              center={[pt.lat, pt.lon]}
              radius={240 + intensity * 800}
              pathOptions={{ color: heatColor(intensity), weight: 0, fillColor: heatColor(intensity), fillOpacity: 0.14 + intensity * 0.14 }}
            >
              <Tooltip direction="top" className="cluster-tip">
                <span style={{ fontSize: 11, fontWeight: 700, color: "#dc2626" }}>Accident hotspot</span>
                <span style={{ fontSize: 10, color: "#6b7280", display: "block" }}>Intensity: {Math.round(intensity * 100)}%</span>
              </Tooltip>
            </Circle>
          );
        })}

        <ZoomControl position="bottomright" />
      </MapContainer>

      {/* Legend */}
      <div style={{ position: "absolute", bottom: 20, left: 16, zIndex: 1000, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(12px)", borderRadius: 16, border: "1px solid #fed7aa", padding: "12px 14px", boxShadow: "0 4px 16px rgba(234,88,12,0.10)" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Accident density</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {RAMP.map(({ color, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block" }} />
              <span style={{ fontSize: 10, color: "#374151", fontWeight: 600 }}>{label}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid #fed7aa", fontSize: 10, color: "#6b7280" }}>
          Click a district for details
        </div>
      </div>

      {/* District click panel */}
      {selectedDistrict && (
        <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", zIndex: 1001, width: 236, background: "rgba(255,255,255,0.97)", backdropFilter: "blur(16px)", borderRadius: 20, border: "1px solid #fed7aa", boxShadow: "0 8px 32px rgba(234,88,12,0.12)", overflow: "hidden" }}>
          <div style={{ height: 4, background: "#f97316" }} />
          <div style={{ padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>Road safety · Bihar</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#0b0d10" }}>{selectedDistrict.name}</div>
              </div>
              <button type="button" onClick={() => setSelectedDistrict(null)} style={{ background: "#fff7ed", border: "none", borderRadius: 8, width: 26, height: 26, cursor: "pointer", fontSize: 13, color: "#f97316" }}>✕</button>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 12 }}>
              <span style={{ fontSize: 36, fontWeight: 900, color: "#dc2626", lineHeight: 1 }}>{selectedDistrict.count.toLocaleString("en-IN")}</span>
              <span style={{ fontSize: 12, color: "#6b7280" }}>accidents</span>
            </div>
            {maxCount > 0 && (
              <div>
                <div style={{ height: 6, borderRadius: 3, background: "#fff7ed", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 3, background: "#f97316", width: `${Math.round((selectedDistrict.count / maxCount) * 100)}%` }} />
                </div>
                <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 4 }}>{Math.round((selectedDistrict.count / maxCount) * 100)}% of highest district</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
