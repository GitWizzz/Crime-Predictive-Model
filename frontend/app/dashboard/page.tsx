"use client";

import { useEffect, useState } from "react";
import { fetchFIRs, fetchHotspots } from "@/services/hotspots";
import { apiGet } from "@/services/api";

export default function DashboardPage() {
  const [token, setToken] = useState<string | null>(null);
  const [stats, setStats] = useState({
    firTotal: 0,
    hotspotTotal: 0,
    health: "Unknown",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setToken(window.localStorage.getItem("authToken"));
    }
  }, []);

  useEffect(() => {
    const loadStats = async () => {
      if (!token) return;
      try {
        const [firRes, hotspotRes, healthRes] = await Promise.all([
          fetchFIRs(token, { limit: 1 }),
          fetchHotspots(token),
          apiGet("/api/health", null),
        ]);

        setStats({
          firTotal: firRes.data?.total || 0,
          hotspotTotal: hotspotRes.data?.length || 0,
          health: healthRes?.success ? "OK" : "Degraded",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard stats");
      }
    };

    loadStats();
  }, [token]);

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-zinc-500">Total FIRs</p>
          <p className="text-2xl font-semibold">{stats.firTotal}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-zinc-500">Active Hotspots</p>
          <p className="text-2xl font-semibold">{stats.hotspotTotal}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-zinc-500">System Health</p>
          <p className="text-2xl font-semibold">{stats.health}</p>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <h2 className="text-lg font-semibold">Quick Actions</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Use FIR Records for bulk uploads and Hotspots for map analysis.
        </p>
      </div>
    </div>
  );
}