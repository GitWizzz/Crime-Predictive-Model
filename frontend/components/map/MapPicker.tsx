"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import markerIconUrl from "leaflet/dist/images/marker-icon.png";
import markerIcon2xUrl from "leaflet/dist/images/marker-icon-2x.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";

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

export default function MapPicker({ lat, lng, onChange, className, zoom = 13 }: MapPickerProps) {
  useEffect(() => {
    // Ensure Leaflet default icon paths are correct in Next.js build
    try {
      // @ts-ignore
      L.Icon.Default.mergeOptions({
        iconUrl: markerIconUrl.src || markerIconUrl,
        iconRetinaUrl: markerIcon2xUrl.src || markerIcon2xUrl,
        shadowUrl: markerShadowUrl.src || markerShadowUrl,
      });
    } catch (e) {
      // ignore
    }
  }, []);

  const center: [number, number] = [lat ?? 25.6, lng ?? 85.2];

  return (
    <div className={className}>
      <MapContainer center={center} zoom={zoom} scrollWheelZoom style={{ height: "240px", width: "100%" }}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
        <MapClickHandler onChange={onChange} />
        {typeof lat === "number" && typeof lng === "number" ? (
          (() => {
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
              <Marker
                position={[lat, lng]}
                icon={redIcon}
                draggable
                eventHandlers={{
                  dragend: (e) => {
                    const marker = e.target;
                    const pos = marker.getLatLng();
                    onChange?.(pos.lat, pos.lng);
                  },
                }}
              />
            );
          })()
        ) : null}
      </MapContainer>
    </div>
  );
}
