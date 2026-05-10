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

  return (
    <div className="p-4">
      <div className="mb-4">
        <p className="text-xs font-semibold text-[var(--fg-tertiary)]">Cluster ID</p>
        <div className="mt-1 text-lg font-semibold text-[var(--fg-primary)]">{hotspot.clusterId}</div>
      </div>

      <div className="mb-4">
        <p className="text-xs font-semibold text-[var(--fg-tertiary)]">Incidents</p>
        <div className="mt-1 text-2xl font-semibold text-[var(--fg-primary)]">{fmt(hotspot.crimeCount)}</div>
      </div>

      <div className="mb-4">
        <p className="text-xs font-semibold text-[var(--fg-tertiary)]">Crime mix</p>
        <div className="mt-2 space-y-2">
          {topEntries.map(([type, count]) => (
            <div key={type} className="flex items-center justify-between text-sm">
              <span className="text-[var(--fg-secondary)]">{type}</span>
              <span className="font-semibold text-[var(--fg-primary)]">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={onShowFirs} className="flex-1 rounded-lg border bg-[var(--bg-surface)] px-3 py-2 text-sm">
          Show FIRs
        </button>
        <button onClick={onDispatch} className="flex-1 rounded-lg bg-[var(--accent-500)] px-3 py-2 text-sm font-semibold text-white">
          Dispatch patrol
        </button>
      </div>
    </div>
  );
}
