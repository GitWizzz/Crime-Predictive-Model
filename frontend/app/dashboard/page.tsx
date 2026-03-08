"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, MapPinned, Radar, ShieldAlert, Siren, Users } from "lucide-react";
import { fetchFIRs, fetchHotspots } from "@/services/hotspots";
import { apiGet } from "@/services/api";
import { fetchZones } from "@/services/zones";
import { fetchWomenSafety } from "@/services/analytics";
import { fetchIradAccidents } from "@/services/irad";

type ZoneTotal = {
  name: string;
  crime_count: number;
};

const fmt = (value: number) => new Intl.NumberFormat("en-IN").format(value);

export default function DashboardPage() {
  const [token, setToken] = useState<string | null>(null);
  const [stats, setStats] = useState({
    firTotal: 0,
    firLast7Days: 0,
    hotspotTotal: 0,
    districtTotal: 0,
    stationTotal: 0,
    womenSafetySignals: 0,
    iradTotal: 0,
    topDistrict: "N/A",
    health: "Unknown",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setToken(window.localStorage.getItem("authToken"));
    }
  }, []);

  useEffect(() => {
    const loadStats = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);

        const [
          firRes,
          fir7Res,
          hotspotRes,
          healthRes,
          districtRes,
          stationRes,
          womenSafetyRes,
          iradRes,
        ] = await Promise.all([
          fetchFIRs(token, { limit: 1 }),
          fetchFIRs(token, { limit: 1, startDate: sevenDaysAgo }),
          fetchHotspots(token),
          apiGet("/api/health", null),
          fetchZones(token, { type: "DISTRICT" }),
          fetchZones(token, { type: "STATION" }),
          fetchWomenSafety(token),
          fetchIradAccidents(token),
        ]);

        const districtTotals: ZoneTotal[] = districtRes.data?.totals || [];
        const topDistrict =
          districtTotals.length > 0
            ? [...districtTotals].sort((a, b) => b.crime_count - a.crime_count)[0]
                ?.name || "N/A"
            : "N/A";

        setStats({
          firTotal: firRes.data?.total || 0,
          firLast7Days: fir7Res.data?.total || 0,
          hotspotTotal: hotspotRes.data?.length || 0,
          districtTotal: districtRes.data?.totals?.length || 0,
          stationTotal: stationRes.data?.totals?.length || 0,
          womenSafetySignals: womenSafetyRes.data?.heat_points?.length || 0,
          iradTotal: Array.isArray(iradRes.data) ? iradRes.data.length : 0,
          topDistrict,
          health: healthRes?.success ? "OK" : "Degraded",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard stats");
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [token]);

  const activityRate = stats.firTotal > 0 ? Math.min(100, (stats.firLast7Days / stats.firTotal) * 100) : 0;
  const womenShare = stats.firTotal > 0 ? Math.min(100, (stats.womenSafetySignals / stats.firTotal) * 100) : 0;
  const coverageRatio =
    stats.districtTotal > 0 ? Math.min(100, (stats.stationTotal / stats.districtTotal) * 100) : 0;
  const healthTone =
    stats.health === "OK"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      : "border-amber-500/40 bg-amber-500/10 text-amber-300";

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="dash-card dash-card-hover p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-300/80">Operations Overview</p>
            <h2 className="mt-1 text-2xl font-semibold text-zinc-100">Crime Control Command Board</h2>
          </div>
          <div className={`ml-auto rounded-full border px-3 py-1 text-xs font-semibold ${healthTone}`}>
            System {loading ? "Checking..." : stats.health}
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 p-3">
            <p className="text-xs uppercase tracking-wide text-cyan-200/90">Priority District</p>
            <p className="mt-1 text-lg font-semibold text-zinc-100">{loading ? "..." : stats.topDistrict}</p>
          </div>
          <div className="rounded-xl border border-fuchsia-500/25 bg-fuchsia-500/10 p-3">
            <p className="text-xs uppercase tracking-wide text-fuchsia-200/90">Hotspot Clusters</p>
            <p className="mt-1 text-lg font-semibold text-zinc-100">{loading ? "..." : fmt(stats.hotspotTotal)}</p>
          </div>
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3">
            <p className="text-xs uppercase tracking-wide text-amber-200/90">IRAD Incidents</p>
            <p className="mt-1 text-lg font-semibold text-zinc-100">{loading ? "..." : fmt(stats.iradTotal)}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="dash-card dash-card-hover p-4">
          <div className="flex items-start justify-between">
            <p className="dash-muted">Total FIRs Registered</p>
            <Siren className="h-4 w-4 text-rose-300" />
          </div>
          <p className="mt-2 text-3xl font-semibold text-zinc-100">{loading ? "..." : fmt(stats.firTotal)}</p>
          <p className="mt-1 text-xs text-zinc-400">Base case volume in current dataset</p>
        </div>
        <div className="dash-card dash-card-hover p-4">
          <div className="flex items-start justify-between">
            <p className="dash-muted">FIRs Last 7 Days</p>
            <Radar className="h-4 w-4 text-cyan-300" />
          </div>
          <p className="mt-2 text-3xl font-semibold text-zinc-100">{loading ? "..." : fmt(stats.firLast7Days)}</p>
          <div className="mt-2 h-2 rounded-full bg-zinc-800">
            <div className="h-full rounded-full bg-cyan-400" style={{ width: `${activityRate}%` }} />
          </div>
          <p className="mt-1 text-xs text-zinc-400">{activityRate.toFixed(1)}% of total FIRs</p>
        </div>
        <div className="dash-card dash-card-hover p-4">
          <div className="flex items-start justify-between">
            <p className="dash-muted">Women Safety Signals</p>
            <ShieldAlert className="h-4 w-4 text-fuchsia-300" />
          </div>
          <p className="mt-2 text-3xl font-semibold text-zinc-100">
            {loading ? "..." : fmt(stats.womenSafetySignals)}
          </p>
          <div className="mt-2 h-2 rounded-full bg-zinc-800">
            <div className="h-full rounded-full bg-fuchsia-400" style={{ width: `${womenShare}%` }} />
          </div>
          <p className="mt-1 text-xs text-zinc-400">{womenShare.toFixed(1)}% of total FIRs</p>
        </div>
        <div className="dash-card dash-card-hover p-4">
          <div className="flex items-start justify-between">
            <p className="dash-muted">Network Coverage</p>
            <Users className="h-4 w-4 text-emerald-300" />
          </div>
          <p className="mt-2 text-3xl font-semibold text-zinc-100">
            {loading ? "..." : `${fmt(stats.stationTotal)} / ${fmt(stats.districtTotal)}`}
          </p>
          <div className="mt-2 h-2 rounded-full bg-zinc-800">
            <div className="h-full rounded-full bg-emerald-400" style={{ width: `${coverageRatio}%` }} />
          </div>
          <p className="mt-1 text-xs text-zinc-400">Stations mapped per district footprint</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="dash-card dash-card-hover p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">Operational Snapshot</h3>
          <div className="mt-3 space-y-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Active Hotspot Density</span>
                <span>{loading ? "..." : `${stats.hotspotTotal} clusters`}</span>
              </div>
              <p className="mt-1 text-sm text-zinc-200">
                Focus patrol allocation in <strong>{stats.topDistrict}</strong> and nearest adjacent stations.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Recent Incident Pressure</span>
                <span>{loading ? "..." : `${stats.firLast7Days} cases / 7d`}</span>
              </div>
              <p className="mt-1 text-sm text-zinc-200">
                Last 7 days contribute <strong>{activityRate.toFixed(1)}%</strong> of dataset volume.
              </p>
            </div>
          </div>
        </div>

        <div className="dash-card dash-card-hover p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">Action Center</h3>
          <div className="mt-3 grid gap-2">
            {[
              {
                href: "/dashboard/hotspots",
                title: "Hotspot Command Map",
                desc: "Review cluster boxes, click for type-wise crime breakup",
                icon: MapPinned,
              },
              {
                href: "/dashboard/firs",
                title: "FIR Intake & Validation",
                desc: "Create and bulk-import FIR records with full fields",
                icon: Siren,
              },
              {
                href: "/dashboard/analytics",
                title: "Forecast & Risk Analytics",
                desc: "Open seasonal, forecast, and district risk sections",
                icon: Radar,
              },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-xl border border-zinc-800 bg-zinc-900/80 p-3 transition hover:border-cyan-500/40 hover:bg-zinc-900"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-md border border-zinc-700 bg-zinc-800 p-2">
                    <item.icon className="h-4 w-4 text-cyan-300" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-zinc-100">{item.title}</p>
                      <ArrowUpRight className="h-4 w-4 text-zinc-500 transition group-hover:text-cyan-300" />
                    </div>
                    <p className="mt-1 text-xs text-zinc-400">{item.desc}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
