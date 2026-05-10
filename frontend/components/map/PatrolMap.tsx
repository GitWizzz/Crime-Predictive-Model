"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Polyline, Marker, TileLayer, GeoJSON, useMap } from "react-leaflet";
import type { FeatureCollection } from "geojson";

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);

const STADIA = "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png";
const BIHAR_BOUNDS: [[number, number], [number, number]] = [[24.3, 83.2], [27.5, 88.5]];
const DISTRICT_STYLE = { color: "#93c5fd", weight: 1, opacity: 0.55, fillColor: "#f8fafc", fillOpacity: 0.15 };

type Stop = {
  latitude: number;
  longitude: number;
  zone_name?: string;
};

const FitBounds = ({ positions }: { positions: [number, number][] }) => {
  const map = useMap();
  useEffect(() => {
    if (positions.length) {
      map.fitBounds(positions, { padding: [24, 24] });
    } else {
      map.fitBounds(BIHAR_BOUNDS, { padding: [28, 28] });
    }
  }, [positions, map]);
  return null;
};

export default function PatrolMap({
  stops,
  simulate = true,
}: {
  stops: Stop[];
  simulate?: boolean;
}) {
  const positions = useMemo(
    () => stops.map((s) => [s.latitude, s.longitude] as [number, number]),
    [stops]
  );
  const [idx, setIdx] = useState(0);
  const [districtGeo, setDistrictGeo] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    fetch("/bihar_districts.geojson").then(r => r.json()).then(setDistrictGeo).catch(() => {});
  }, []);

  useEffect(() => {
    if (!simulate || positions.length === 0) return;
    const id = setInterval(() => {
      setIdx((prev) => (prev + 1) % positions.length);
    }, 1000);
    return () => clearInterval(id);
  }, [simulate, positions.length]);

  const markerPos = positions[idx] || [25.6, 85.2];

  return (
    <div className="relative h-96 w-full overflow-hidden rounded-[28px] border bg-[var(--bg-surface)] shadow-[var(--shadow-md)]">
      <div className="map-panel absolute left-4 top-4 z-[1000] rounded-2xl px-3 py-2 text-xs font-medium text-[var(--fg-secondary)]">
        Patrol route preview
      </div>
      <MapContainer center={markerPos} zoom={8} className="h-full w-full">
        <TileLayer url={STADIA} attribution='&copy; Stadia Maps' />
        <FitBounds positions={positions} />
        {districtGeo && <GeoJSON data={districtGeo} style={() => DISTRICT_STYLE} />}
        {positions.length > 0 && (
          <Polyline
            positions={positions}
            color="#3b6eff"
            weight={5}
            opacity={0.85}
          />
        )}
        <Marker position={markerPos} />
      </MapContainer>
    </div>
  );
}
