"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Polyline, Marker, TileLayer, useMap } from "react-leaflet";

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);

type Stop = {
  latitude: number;
  longitude: number;
  zone_name?: string;
};

const FitBounds = ({ positions }: { positions: [number, number][] }) => {
  const map = useMap();
  useEffect(() => {
    if (!positions.length) return;
    map.fitBounds(positions, { padding: [24, 24] });
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

  useEffect(() => {
    if (!simulate || positions.length === 0) return;
    const id = setInterval(() => {
      setIdx((prev) => (prev + 1) % positions.length);
    }, 1000);
    return () => clearInterval(id);
  }, [simulate, positions.length]);

  const markerPos = positions[idx] || [25.6, 85.2];

  return (
    <div className="h-96 w-full overflow-hidden rounded-lg border">
      <MapContainer center={markerPos} zoom={8} className="h-full w-full">
        <TileLayer
          attribution="Tiles &copy; Esri"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        <FitBounds positions={positions} />
        {positions.length > 0 && <Polyline positions={positions} color="#22c55e" />}
        <Marker position={markerPos} />
      </MapContainer>
    </div>
  );
}
