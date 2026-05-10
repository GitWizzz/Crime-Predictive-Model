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

const SEVERITY_GRADIENT = [
  { threshold: 0.7, color: "#7c3aed", label: "Critical" },
  { threshold: 0.4, color: "#a855f7", label: "High" },
  { threshold: 0,   color: "#c4b5fd", label: "Low" },
];

const heatColor = (intensity: number) => {
  for (const { threshold, color } of SEVERITY_GRADIENT) {
    if (intensity >= threshold) return color;
  }
  return "#c4b5fd";
};

export default function WomenSafetyMap({ heatPoints, districts, stateBoundary, districtCounts = {} }: Props) {
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

        {/* State boundary */}
        {stateBoundary && (
          <GeoJSON data={stateBoundary} style={() => ({ color: "#60a5fa", weight: 2, opacity: 0.5, fillOpacity: 0 })} />
        )}

        {/* District outlines — shaded by women crime density if counts provided */}
        {staticGeo && (
          <GeoJSON
            key={JSON.stringify(districtCounts)}
            data={staticGeo}
            onEachFeature={(feature, layer) => {
              const name = feature.properties?.name || "";
              const count = districtCounts[name.toLowerCase()] ?? 0;
              const intensity = count / maxCount;
              const baseStyle = {
                color: "#93c5fd",
                weight: 1,
                opacity: 0.7,
                fillColor: "#fce7f3",
                fillOpacity: 0.06 + intensity * 0.3,
              };
              const hoverStyle = { ...baseStyle, color: "#60a5fa", weight: 2.2, fillOpacity: 0.18 + intensity * 0.3 };
              (layer as any).on("mouseover", () => (layer as any).setStyle(hoverStyle));
              (layer as any).on("mouseout",  () => (layer as any).setStyle(baseStyle));
              (layer as any).on("click", () => setSelectedDistrict({ name, count }));
            }}
            style={(feature) => {
              const count = districtCounts[(feature?.properties?.name || "").toLowerCase()] ?? 0;
              return {
                color: "#93c5fd", weight: 1, opacity: 0.7,
                fillColor: "#fce7f3",
                fillOpacity: 0.06 + (count / maxCount) * 0.3,
              };
            }}
          />
        )}

        {/* Women safety KDE heat circles */}
        {heatPoints.map((pt, i) => {
          const intensity = Math.max(0.1, Math.min(1, pt.intensity));
          return (
            <Circle
              key={`w-${i}`}
              center={[pt.lat, pt.lon]}
              radius={260 + intensity * 860}
              pathOptions={{ color: heatColor(intensity), weight: 0, fillColor: heatColor(intensity), fillOpacity: 0.13 + intensity * 0.15 }}
            >
              <Tooltip direction="top" className="cluster-tip">
                <span style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed" }}>Women safety hotspot</span>
                <span style={{ fontSize: 10, color: "#6b7280", display: "block" }}>Intensity: {Math.round(intensity * 100)}%</span>
              </Tooltip>
            </Circle>
          );
        })}

        <ZoomControl position="bottomright" />
      </MapContainer>

      {/* Legend */}
      <div style={{ position: "absolute", bottom: 20, left: 16, zIndex: 1000, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(12px)", borderRadius: 16, border: "1px solid #ede9fe", padding: "12px 14px", boxShadow: "0 4px 16px rgba(124,58,237,0.10)" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Incident density</div>
        <div style={{ height: 8, borderRadius: 4, background: "linear-gradient(to right, #ede9fe, #a855f7, #7c3aed)", width: 130, marginBottom: 4 }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#9ca3af", width: 130 }}>
          <span>Low</span><span>High</span>
        </div>
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid #ede9fe", fontSize: 10, color: "#6b7280" }}>
          Click a district for details
        </div>
      </div>

      {/* District click panel */}
      {selectedDistrict && (
        <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", zIndex: 1001, width: 236, background: "rgba(255,255,255,0.97)", backdropFilter: "blur(16px)", borderRadius: 20, border: "1px solid #ede9fe", boxShadow: "0 8px 32px rgba(124,58,237,0.12)", overflow: "hidden" }}>
          <div style={{ height: 4, background: "#7c3aed" }} />
          <div style={{ padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>Women safety · Bihar</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#0b0d10" }}>{selectedDistrict.name}</div>
              </div>
              <button type="button" onClick={() => setSelectedDistrict(null)} style={{ background: "#ede9fe", border: "none", borderRadius: 8, width: 26, height: 26, cursor: "pointer", fontSize: 13, color: "#7c3aed" }}>✕</button>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 12 }}>
              <span style={{ fontSize: 36, fontWeight: 900, color: "#7c3aed", lineHeight: 1 }}>{selectedDistrict.count.toLocaleString("en-IN")}</span>
              <span style={{ fontSize: 12, color: "#6b7280" }}>reported incidents</span>
            </div>
            {maxCount > 0 && (
              <div>
                <div style={{ height: 6, borderRadius: 3, background: "#ede9fe", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 3, background: "#7c3aed", width: `${Math.round((selectedDistrict.count / maxCount) * 100)}%` }} />
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
