"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bell,
  Crosshair,
  FileText,
  MapPinned,
  RadioTower,
  Route,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import type { FeatureCollection, Geometry, Position } from "geojson";

const features = [
  {
    icon: MapPinned,
    title: "Real-Time Hotspot Mapping",
    description: "Identify crime-prone areas using advanced clustering algorithms like DBSCAN and KDE, visualized on command dashboards.",
  },
  {
    icon: BarChart3,
    title: "Predictive Analytics",
    description: "Forecast crime trends with confidence intervals using Prophet and seasonal analysis.",
  },
  {
    icon: Route,
    title: "Optimized Patrol Routes",
    description: "Generate efficient patrol paths using OR-Tools optimization for maximum coverage of high-risk areas.",
  },
  {
    icon: FileText,
    title: "FIR Data Integration",
    description: "Process and classify FIR records by IPC categories with automated bulk import and validation.",
  },
  {
    icon: Bell,
    title: "Alert System",
    description: "Real-time notifications for emerging hotspots and risk spikes across all 38 districts.",
  },
  {
    icon: ShieldAlert,
    title: "Risk Assessment",
    description: "SHAP-based explanations for risk scores, ensuring transparency and trust in predictions.",
  },
];

const stats = [
  { value: "38", label: "Districts Covered", icon: MapPinned },
  { value: "Secure", label: "FIR Data Pipeline", icon: FileText },
  { value: "Live", label: "Risk Intelligence", icon: Crosshair },
  { value: "80%", label: "Prediction Accuracy", icon: TrendingUp },
];

type DistrictCollection = FeatureCollection<Geometry, { name?: string }>;

const MAP_WIDTH = 620;
const MAP_HEIGHT = 430;
const MAP_PAD = 34;

const isPosition = (value: unknown): value is Position =>
  Array.isArray(value) && typeof value[0] === "number" && typeof value[1] === "number";

const collectRings = (geometry: Geometry): Position[][] => {
  if (geometry.type === "Polygon") return geometry.coordinates as Position[][];
  if (geometry.type === "MultiPolygon") return geometry.coordinates.flat(1) as Position[][];
  return [];
};

const getBounds = (features: DistrictCollection["features"]) => {
  const bounds = features.reduce(
    (acc, feature) => {
      collectRings(feature.geometry).forEach((ring) => {
        ring.forEach((point) => {
          if (!isPosition(point)) return;
          acc.minLon = Math.min(acc.minLon, point[0]);
          acc.maxLon = Math.max(acc.maxLon, point[0]);
          acc.minLat = Math.min(acc.minLat, point[1]);
          acc.maxLat = Math.max(acc.maxLat, point[1]);
        });
      });
      return acc;
    },
    { minLon: Infinity, maxLon: -Infinity, minLat: Infinity, maxLat: -Infinity }
  );

  return Number.isFinite(bounds.minLon) ? bounds : null;
};

const ringToPath = (
  ring: Position[],
  bounds: NonNullable<ReturnType<typeof getBounds>>
) => {
  const width = MAP_WIDTH - MAP_PAD * 2;
  const height = MAP_HEIGHT - MAP_PAD * 2;
  const lonSpan = bounds.maxLon - bounds.minLon || 1;
  const latSpan = bounds.maxLat - bounds.minLat || 1;
  const scale = Math.min(width / lonSpan, height / latSpan);
  const offsetX = (MAP_WIDTH - lonSpan * scale) / 2;
  const offsetY = (MAP_HEIGHT - latSpan * scale) / 2;

  return ring
    .filter(isPosition)
    .map(([lon, lat], index) => {
      const x = offsetX + (lon - bounds.minLon) * scale;
      const y = offsetY + (bounds.maxLat - lat) * scale;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
};

function BiharMapPreview() {
  const [districts, setDistricts] = useState<DistrictCollection | null>(null);

  useEffect(() => {
    fetch("/bihar_districts.geojson")
      .then((response) => response.json())
      .then((data: DistrictCollection) => setDistricts(data))
      .catch(() => setDistricts(null));
  }, []);

  const paths = useMemo(() => {
    if (!districts) return [];
    const bounds = getBounds(districts.features);
    if (!bounds) return [];

    return districts.features.flatMap((feature, featureIndex) =>
      collectRings(feature.geometry).map((ring, ringIndex) => ({
        id: `${feature.properties?.name || "district"}-${featureIndex}-${ringIndex}`,
        d: `${ringToPath(ring, bounds)} Z`,
      }))
    );
  }, [districts]);

  const markers = [
    { x: "48%", y: "34%", tone: "bg-[var(--risk-medium)]", ring: "bg-[var(--risk-medium)]/20", label: "Patna" },
    { x: "59%", y: "23%", tone: "bg-[var(--risk-low)]", ring: "bg-[var(--risk-low)]/20", label: "Muzaffarpur" },
    { x: "67%", y: "55%", tone: "bg-[var(--risk-low)]", ring: "bg-[var(--risk-low)]/20", label: "Bhagalpur" },
    { x: "35%", y: "64%", tone: "bg-[var(--risk-high)]", ring: "bg-[var(--risk-high)]/20", label: "Gaya" },
    { x: "43%", y: "51%", tone: "bg-[var(--risk-medium)]", ring: "bg-[var(--risk-medium)]/20", label: "Nalanda" },
  ];

  return (
    <div className="relative h-[520px] overflow-hidden rounded-lg border border-[var(--accent-500)]/25 bg-[#07100b]/95 shadow-2xl shadow-black/35">
      <div className="absolute inset-0 opacity-[0.10] [background-image:linear-gradient(to_right,rgba(255,255,255,.24)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.24)_1px,transparent_1px)] [background-size:42px_42px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_34%_14%,rgba(34,197,94,.18),transparent_22%),radial-gradient(circle_at_68%_52%,rgba(34,197,94,.14),transparent_28%),linear-gradient(180deg,rgba(34,197,94,.05),transparent_70%)]" />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/75 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-transparent via-white/[0.055] to-transparent [animation:scanLine_5.2s_linear_infinite]" />

      <div className="absolute inset-x-0 top-0 z-10 flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="rounded-md border border-[var(--accent-500)]/30 bg-[#07130d]/90 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.22em] text-[var(--accent-500)]">
            <span className="h-2 w-2 rounded-full bg-[var(--accent-500)]" />
            DBSCAN + KDE Layer
          </div>
          <p className="mt-2 text-xs font-medium text-zinc-400">Bihar statewide command-center preview</p>
        </div>
        <div className="rounded-md border border-white/10 bg-black/40 px-3 py-2 text-right backdrop-blur">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Spatial intelligence</p>
          <p className="mt-1 text-xs font-semibold text-zinc-200">Real Bihar district map</p>
        </div>
      </div>

      <svg className="absolute inset-x-0 top-16 h-[390px] w-full" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} role="img" aria-label="Real Bihar district boundary map preview">
        <g filter="drop-shadow(0 18px 26px rgba(0,0,0,.45))">
          {paths.length ? (
            paths.map((path, index) => (
              <path
                key={path.id}
                d={path.d}
                fill={index % 4 === 0 ? "rgba(34,197,94,.16)" : index % 3 === 0 ? "rgba(255,255,255,.09)" : "rgba(255,255,255,.05)"}
                stroke="rgba(34,197,94,.68)"
                strokeWidth="0.82"
              />
            ))
          ) : (
            <path
              d="M130 86 278 46 414 118 372 348 190 360Z"
              fill="rgba(255,255,255,.07)"
              stroke="rgba(34,197,94,.58)"
              strokeWidth="1.4"
            />
          )}
        </g>
        <path
          d="M128 252 C190 222 248 232 312 258 C372 284 430 264 492 226"
          fill="none"
          stroke="rgba(34,197,94,.56)"
          strokeDasharray="5 10"
          strokeWidth="2"
        />
      </svg>

      {markers.map((marker, index) => (
        <div
          key={marker.label}
          className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
          style={{ left: marker.x, top: marker.y }}
          aria-label={`${marker.label} hotspot`}
        >
          <span
            className={`absolute left-1/2 top-1/2 block h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full blur-md ${marker.ring} [animation:hotspotPulse_3.4s_ease-in-out_infinite]`}
            style={{ animationDelay: `${index * 260}ms` }}
          />
          <span className={`relative block h-3.5 w-3.5 rounded-full border border-white/80 ${marker.tone} shadow-[0_0_22px_rgba(34,197,94,.75)]`} />
        </div>
      ))}

      <div className="absolute left-1/2 top-[42%] h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--accent-500)]/25 [animation:radarPing_2.9s_ease-out_infinite]" />

      <div className="absolute bottom-24 left-4 z-10 rounded-md border border-white/10 bg-black/40 px-3 py-3 backdrop-blur">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Risk scale</p>
        <div className="mt-2 flex items-center gap-1.5">
          {[
            "bg-[var(--risk-low)]",
            "bg-[var(--risk-medium)]",
            "bg-[var(--risk-high)]",
          ].map((color) => (
            <span key={color} className={`h-2.5 w-9 rounded-sm ${color}`} />
          ))}
        </div>
      </div>

      <div className="absolute bottom-24 right-4 z-10 w-44 rounded-md border border-white/10 bg-black/40 px-3 py-3 backdrop-blur">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Live telemetry</p>
        <div className="mt-2 space-y-2 text-xs text-zinc-300">
          <div className="flex justify-between gap-3"><span>Layer</span><strong className="text-[var(--accent-500)]">Both</strong></div>
          <div className="flex justify-between gap-3"><span>Boundary</span><strong>District</strong></div>
          <div className="flex justify-between gap-3"><span>Status</span><strong className="text-[var(--risk-low)]">Synced</strong></div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 grid grid-cols-3 gap-3 p-4">
        {[
          ["Patna", "84", "text-[var(--risk-high)]"],
          ["Gaya", "71", "text-[var(--risk-medium)]"],
          ["Muzaffarpur", "68", "text-[var(--risk-low)]"],
        ].map(([name, value, tone]) => (
          <div key={name} className="rounded-md border border-white/10 bg-black/45 px-3 py-3 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-sm font-bold text-zinc-100">{name}</span>
              <span className={`text-sm font-black ${tone}`}>{value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="dark fixed inset-0 overflow-y-auto overflow-x-hidden bg-[var(--bg-base)] text-[var(--fg-primary)] [scrollbar-width:auto] [&::-webkit-scrollbar]:block">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_72%_10%,rgba(34,197,94,.09),transparent_28%),radial-gradient(circle_at_18%_88%,rgba(245,158,11,.055),transparent_25%),linear-gradient(135deg,#0d0f12_0%,#111417_54%,#0c0f0e_100%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.055] [background-image:linear-gradient(to_right,rgba(255,255,255,.22)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.22)_1px,transparent_1px)] [background-size:72px_72px]" />

      <section className="relative z-10 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,1.08fr)]">
          <div className="text-center lg:text-left">
            <div className="mb-8 flex justify-center lg:justify-start">
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-500)]/25 bg-[var(--accent-50)] px-4 py-2 text-sm font-bold uppercase tracking-wide text-[var(--accent-500)]">
                <RadioTower className="h-4 w-4" />
                Bihar Police Intelligence System
              </span>
            </div>

            <h1 className="mx-auto max-w-4xl text-4xl font-black leading-tight tracking-tight text-zinc-50 sm:text-5xl lg:mx-0 lg:text-6xl">
              Transform FIR Data into
              <span className="block text-[var(--accent-500)]">Actionable Crime Intelligence</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400 sm:text-xl lg:mx-0">
              CrimeMap analyzes FIR records to identify hotspots, predict trends, and optimize patrol routes across all 38 districts of Bihar. Empowering police operations with data-driven decisions.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                href="/dashboard"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[var(--accent-500)] px-8 text-base font-bold text-white shadow-lg shadow-[var(--accent-500)]/25 transition-colors hover:bg-[var(--accent-600)]"
              >
                Access Command Center
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-8 text-base font-semibold text-zinc-200 transition-colors hover:border-[var(--accent-500)]/35 hover:bg-[var(--accent-500)]/10"
              >
                Officer Sign In
              </Link>
            </div>
          </div>

          <BiharMapPreview />
        </div>
      </section>

      <section className="relative z-10 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--accent-500)]/10">
                  <stat.icon className="h-6 w-6 text-[var(--accent-500)]" />
                </div>
                <div className="text-3xl font-black text-zinc-100 sm:text-4xl">{stat.value}</div>
                <div className="mt-2 text-sm font-medium text-zinc-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-black text-zinc-50 sm:text-4xl">Key Capabilities</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
              Advanced analytics and visualization tools designed for modern police operations.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-lg border border-white/10 bg-[#14171b]/50 p-6 backdrop-blur-sm">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--accent-500)]/10">
                  <feature.icon className="h-6 w-6 text-[var(--accent-500)]" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-zinc-100">{feature.title}</h3>
                <p className="text-zinc-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-black text-zinc-50 sm:text-4xl">Ready to Enhance Police Operations?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
            Join the Bihar Police in leveraging data-driven insights for safer communities.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/dashboard"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[var(--accent-500)] px-8 text-base font-bold text-white shadow-lg shadow-[var(--accent-500)]/25 transition-colors hover:bg-[var(--accent-600)]"
            >
              Launch Dashboard
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-8 text-base font-semibold text-zinc-200 transition-colors hover:border-[var(--accent-500)]/35 hover:bg-[var(--accent-500)]/10"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl text-center">
          <p className="text-sm text-zinc-500">
            (c) 2026 Bihar Police Crime Intelligence System. Final Year College Project.
          </p>
        </div>
      </footer>
    </main>
  );
}
