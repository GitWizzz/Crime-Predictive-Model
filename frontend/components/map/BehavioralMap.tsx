"use client";

import { useEffect, useState } from "react";
import { CircleMarker, GeoJSON, MapContainer, TileLayer, Tooltip, ZoomControl } from "react-leaflet";
import type { FeatureCollection } from "geojson";

type BehavioralPoint = {
  id: string;
  lat: number;
  lon: number;
  cluster: "A" | "B" | "C";
  label?: string;
};

const CLUSTER_COLOR: Record<"A" | "B" | "C", string> = {
  A: "#3B6EFF",
  B: "#D97706",
  C: "#DC2626",
};

const CLUSTER_LABEL: Record<"A" | "B" | "C", string> = {
  A: "Low-violence",
  B: "Property crime",
  C: "Violent",
};

const BIHAR_CENTER: [number, number] = [25.6, 85.2];

const DISTRICT_STYLE = {
  color: "#94a3b8",
  weight: 1,
  opacity: 0.6,
  fillColor: "#e2e8f0",
  fillOpacity: 0.25,
};

export default function BehavioralMap({ points }: { points: BehavioralPoint[] }) {
  const [districtGeo, setDistrictGeo] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    fetch("/bihar_districts.geojson")
      .then((r) => r.json())
      .then(setDistrictGeo)
      .catch(() => {});
  }, []);

  const validPoints = points.filter(
    (p) => Number.isFinite(p.lat) && Number.isFinite(p.lon) &&
           p.lat >= 24.0 && p.lat <= 27.8 &&
           p.lon >= 83.0 && p.lon <= 88.6
  );

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[18px] border">
      <MapContainer
        center={BIHAR_CENTER}
        zoom={7}
        minZoom={6}
        maxZoom={13}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a>'
        />

        {districtGeo && (
          <GeoJSON data={districtGeo} style={() => DISTRICT_STYLE} />
        )}

        {validPoints.map((pt) => (
          <CircleMarker
            key={pt.id}
            center={[pt.lat, pt.lon]}
            radius={8}
            pathOptions={{
              color: "#ffffff",
              weight: 1.8,
              fillColor: CLUSTER_COLOR[pt.cluster],
              fillOpacity: 0.88,
            }}
          >
            <Tooltip direction="top" offset={[0, -6]} className="behavioral-tip">
              <div style={{ fontSize: 12, fontWeight: 700, color: CLUSTER_COLOR[pt.cluster] }}>
                {pt.label || `Cluster ${pt.cluster}`}
              </div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>{CLUSTER_LABEL[pt.cluster]}</div>
            </Tooltip>
          </CircleMarker>
        ))}

        <ZoomControl position="bottomright" />
      </MapContainer>

      {/* Legend overlay */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 1000,
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(8px)",
          borderRadius: 14,
          border: "1px solid #e4e7eb",
          padding: "10px 14px",
          fontSize: 11,
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#64748b", marginBottom: 8 }}>
          Clusters
        </div>
        {(["C", "B", "A"] as const).map((k) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: CLUSTER_COLOR[k], display: "inline-block", border: "1.5px solid #fff", boxShadow: "0 0 0 1px " + CLUSTER_COLOR[k] }} />
            <span style={{ color: "#374151", fontWeight: 600 }}>
              {k} · <span style={{ fontWeight: 400, color: "#6b7280" }}>{CLUSTER_LABEL[k]}</span>
            </span>
          </div>
        ))}
      </div>

      {validPoints.length === 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
            pointerEvents: "none",
          }}
        >
          <div style={{ background: "rgba(255,255,255,0.9)", borderRadius: 14, padding: "12px 20px", fontSize: 13, color: "#64748b", border: "1px solid #e4e7eb" }}>
            No behavioural cluster data available
          </div>
        </div>
      )}
    </div>
  );
}
