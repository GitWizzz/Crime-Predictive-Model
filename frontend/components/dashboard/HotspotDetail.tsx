"use client";

import React from "react";

type Hotspot = {
  clusterId: string;
  crimeCount: number;
  crimeDistribution?: Record<string, number>;
};

type Props = {
  hotspot: Hotspot | null;
  fmt: (n?: number) => string;
  onShowFirs?: () => void;
  onDispatch?: () => void;
};

export default function HotspotDetail({ hotspot, fmt, onShowFirs, onDispatch }: Props) {
  if (!hotspot)
    return (
      <div className="p-6">
        <p className="text-sm text-[var(--fg-secondary)]">Select a hotspot on the map to inspect details.</p>
      </div>
    );

  const topEntries = Object.entries(hotspot.crimeDistribution || {})
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 5);
}
