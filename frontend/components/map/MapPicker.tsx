"use client";

import { useEffect, useState } from "react";
import { GeoJSON, MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import markerIconUrl from "leaflet/dist/images/marker-icon.png";
import markerIcon2xUrl from "leaflet/dist/images/marker-icon-2x.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";
import type { FeatureCollection } from "geojson";

const STADIA_STREET = "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png";
const TILE_ATTRIBUTION = '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>';

type MapPickerProps = {
  lat?: number | null;
  lng?: number | null;
  onChange?: (lat: number, lng: number) => void;
  className?: string;
  zoom?: number;
};

function MapClickHandler({ onChange }: { onChange?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapPicker({ lat, lng, onChange, className, zoom = 8 }: MapPickerProps) {
  const [biharGeo, setBiharGeo] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    // Fix Leaflet default icon paths in Next.js build
    try {
      // @ts-ignore
      L.Icon.Default.mergeOptions({
        iconUrl: markerIconUrl.src || markerIconUrl,
        iconRetinaUrl: markerIcon2xUrl.src || markerIcon2xUrl,
        shadowUrl: markerShadowUrl.src || markerShadowUrl,
      });
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetch("/bihar_districts.geojson")
      .then((r) => r.json())
      .then(setBiharGeo)
      .catch(() => {});
  }, []);

  const center: [number, number] = [lat ?? 25.6, lng ?? 85.2];

  const svg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns='http://www.w3.org/2000/svg' width='25' height='41' viewBox='0 0 25 41'><path d='M12.5 0C7 0 2.5 4.5 2.5 10c0 7.5 10 21 10 21s10-13.5 10-21C22.5 4.5 18 0 12.5 0z' fill='%23ef4444' stroke='%23b91c1c'/><circle cx='12.5' cy='10' r='4' fill='white' /></svg>`;
  const redIcon = L.icon({
    iconUrl: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: typeof markerShadowUrl === "string" ? markerShadowUrl : (markerShadowUrl as { src: string }).src,
    shadowSize: [41, 41],
    shadowAnchor: [12, 41],
  });

  return (
    <div className={className}>
      <MapContainer center={center} zoom={zoom} scrollWheelZoom style={{ height: "240px", width: "100%" }}>
        <TileLayer url={STADIA_STREET} attribution={TILE_ATTRIBUTION} />

        {biharGeo && (
          <GeoJSON
            data={biharGeo}
            style={() => ({
              color: "#94a3b8",
              weight: 1,
              opacity: 0.6,
              fillColor: "#e2e8f0",
              fillOpacity: 0.18,
            })}
          />
        )}

        <MapClickHandler onChange={onChange} />

        {typeof lat === "number" && typeof lng === "number" ? (
          <Marker
            position={[lat, lng]}
            icon={redIcon}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const pos = e.target.getLatLng();
                onChange?.(pos.lat, pos.lng);
              },
            }}
          />
        ) : null}
      </MapContainer>
    </div>
  );
}
