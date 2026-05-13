"use client";

import { useEffect, useState } from "react";
import { Circle, GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";
import type { FeatureCollection } from "geojson";

const STADIA = "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png";
const BIHAR_CENTER: [number, number] = [25.6, 85.6];
const BIHAR_BOUNDS: [[number, number], [number, number]] = [[24.3, 83.2], [27.5, 88.5]];

const DISTRICT_STYLE = {
  color: "#93c5fd",
  weight: 1,
  opacity: 0.8,
  fillColor: "#dbeafe",
  fillOpacity: 0.06,
};

const HOVER_STYLE = {
  color: "#60a5fa",
  weight: 2,
  opacity: 1,
  fillColor: "#dbeafe",
  fillOpacity: 0.18,
};

const DEMO_HOTSPOTS: Array<{ lat: number; lon: number; intensity: number; label: string }> = [
  { lat: 25.5941, lon: 85.1376, intensity: 0.84, label: "Patna" },
  { lat: 24.7955, lon: 84.9994, intensity: 0.71, label: "Gaya" },
  { lat: 26.1197, lon: 85.3910, intensity: 0.63, label: "Muzaffarpur" },
  { lat: 25.2425, lon: 87.0059, intensity: 0.45, label: "Bhagalpur" },
  { lat: 26.1542, lon: 85.8918, intensity: 0.38, label: "Darbhanga" },
  { lat: 25.1460, lon: 85.4440, intensity: 0.52, label: "Nalanda" },
];

const heatColor = (intensity: number) => {
  if (intensity >= 0.7) return "#dc2626";
  if (intensity >= 0.45) return "#d97706";
  return "#16a34a";
};

const FitBounds = () => {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(BIHAR_BOUNDS, { padding: [20, 20] });
    map.scrollWheelZoom.disable();
  }, [map]);
  return null;
};

export default function LandingMap() {
  const [geo, setGeo] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    fetch("/bihar_districts.geojson")
      .then((r) => r.json())
      .then(setGeo)
      .catch(() => {});
  }, []);

  return (
    <div className="h-full w-full">
      <MapContainer
        center={BIHAR_CENTER}
        zoom={7}
        minZoom={6}
        maxZoom={11}
        className="h-full w-full"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url={STADIA} />
        <FitBounds />

        {geo && (
          <GeoJSON
            key="districts"
            data={geo}
            style={() => DISTRICT_STYLE}
            onEachFeature={(_, layer) => {
              (layer as any).on("mouseover", () => (layer as any).setStyle(HOVER_STYLE));
              (layer as any).on("mouseout",  () => (layer as any).setStyle(DISTRICT_STYLE));
            }}
          />
        )}

        {DEMO_HOTSPOTS.map((pt) => {
          const color = heatColor(pt.intensity);
          return (
            <Circle
              key={pt.label}
              center={[pt.lat, pt.lon]}
              radius={18000 + pt.intensity * 28000}
              pathOptions={{
                color,
                weight: 0,
                fillColor: color,
                fillOpacity: 0.18 + pt.intensity * 0.14,
              }}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}
