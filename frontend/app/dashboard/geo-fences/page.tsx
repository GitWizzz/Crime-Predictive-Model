"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { GeoJsonObject } from "geojson";
import { Plus, Trash2, ToggleLeft, ToggleRight, AlertCircle } from "lucide-react";
import { fetchZones } from "@/services/zones";
import { apiGet, apiPost } from "@/services/api";

const HotspotsMap = dynamic(() => import("@/components/map/HotspotsMap"), { ssr: false });

type GeoFence = {
  id: number;
  name: string;
  type: string;
  boundary: GeoJsonObject | null;
  alert_radius_m: number;
  notify_roles: string[];
  description: string | null;
  active: boolean;
  created_at: string;
};

const typeTone: Record<string, string> = {
  SCHOOL:      "bg-[var(--accent-50)] text-[var(--accent-700)]",
  GOVERNMENT:  "bg-[var(--risk-high-bg)] text-[var(--risk-high)]",
  MARKET:      "bg-[var(--risk-medium-bg)] text-[var(--risk-medium)]",
  HOSPITAL:    "bg-[var(--risk-low-bg)] text-[var(--risk-low)]",
  TRANSIT:     "bg-[var(--bg-subtle)] text-[var(--fg-secondary)]",
  OTHER:       "bg-[var(--bg-subtle)] text-[var(--fg-secondary)]",
};

const FENCE_TYPES = ["SCHOOL", "GOVERNMENT", "MARKET", "HOSPITAL", "TRANSIT", "OTHER"];

const emptyForm = { name: "", type: "SCHOOL", description: "", alert_radius_m: 500 };

export default function GeoFencesPage() {
  const [token] = useState<string | null>(() =>
    typeof window !== "undefined" ? window.localStorage.getItem("authToken") : null
  );
  const [authUser] = useState<{ role?: string } | null>(() => {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(window.localStorage.getItem("authUser") || "null"); } catch { return null; }
  });

  const [fences, setFences]           = useState<GeoFence[]>([]);
  const [districtsGeo, setDistrictsGeo] = useState<GeoJsonObject | null>(null);
  const [stateBoundary, setStateBoundary] = useState<GeoJsonObject | null>(null);
  const [selected, setSelected]       = useState<GeoFence | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [showCreate, setShowCreate]   = useState(false);
  const [form, setForm]               = useState(emptyForm);
  const [creating, setCreating]       = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const isAdmin = authUser?.role === "ADMIN";

  const loadFences = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet("/api/geo-fences", token);
      if (!res.success) throw new Error(res.message || "Failed to load fences");
      setFences(res.data || []);
      if (res.data?.length > 0 && !selected) setSelected(res.data[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load fences");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      const [zonesRes] = await Promise.allSettled([
        fetchZones(token, { type: "DISTRICT" }),
        loadFences(),
      ]);
      if (zonesRes.status === "fulfilled") {
        setDistrictsGeo(zonesRes.value.data?.geojson || null);
        setStateBoundary(zonesRes.value.data?.state_boundary || null);
      }
    };
    load();
  }, [token]);

  const toggleFence = async (fence: GeoFence) => {
    if (!token || !isAdmin) return;
    try {
      const res = await fetch(`/api/geo-fences/${fence.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ active: !fence.active }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setFences((prev) => prev.map((f) => (f.id === fence.id ? { ...f, active: !f.active } : f)));
      if (selected?.id === fence.id) setSelected((prev) => prev ? { ...prev, active: !prev.active } : prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update fence");
    }
  };

  const deleteFence = async (fence: GeoFence) => {
    if (!token || !isAdmin) return;
    if (!confirm(`Deactivate "${fence.name}"?`)) return;
    try {
      const res = await fetch(`/api/geo-fences/${fence.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setFences((prev) => prev.map((f) => (f.id === fence.id ? { ...f, active: false } : f)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete fence");
    }
  };

  const createFence = async () => {
    if (!token) return;
    setCreating(true);
    setCreateError(null);
    try {
      const boundary = {
        type: "Polygon",
        coordinates: [[[85.13, 25.60], [85.14, 25.60], [85.14, 25.61], [85.13, 25.61], [85.13, 25.60]]],
      };
      const res = await apiPost("/api/geo-fences", {
        name: form.name,
        type: form.type,
        description: form.description || null,
        alert_radius_m: Number(form.alert_radius_m) || 500,
        notify_roles: ["ADMIN", "OFFICER"],
        boundary,
      }, token);
      if (!res.success) throw new Error(res.message || "Failed to create fence");
      setShowCreate(false);
      setForm(emptyForm);
      await loadFences();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create fence");
    } finally {
      setCreating(false);
    }
  };

  const activeFences  = fences.filter((f) => f.active);
  const inactiveFences = fences.filter((f) => !f.active);

  const fencesGeoJson: GeoJsonObject | null = fences.length
    ? {
        type: "FeatureCollection",
        features: fences
          .filter((f) => f.boundary)
          .map((f) => ({
            type: "Feature",
            geometry: f.boundary,
            properties: { id: f.id, name: f.name, active: f.active, type: f.type },
          })),
      } as GeoJsonObject
    : null;

  return (
    <div className="mx-auto max-w-[1440px] space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">Geo-fences</h1>
          <p className="mt-1 text-[13px] text-[var(--fg-secondary)]">
            {loading ? "Loading…" : `${fences.length} fences · ${activeFences.length} active`}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex h-10 items-center gap-2 rounded-[14px] bg-[var(--accent-500)] px-4 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            Create fence
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-[14px] border border-[var(--risk-high)]/20 bg-[var(--risk-high-bg)] px-4 py-3 text-sm text-[var(--risk-high)]">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        {/* Fence list */}
        <div className="space-y-2">
          {loading ? (
            <div className="rounded-[20px] border bg-[var(--bg-surface)] p-6 text-center text-sm text-[var(--fg-tertiary)]">
              Loading fences…
            </div>
          ) : fences.length === 0 ? (
            <div className="rounded-[20px] border bg-[var(--bg-surface)] p-6 text-center text-sm text-[var(--fg-tertiary)]">
              No geo-fences found. Create one to get started.
            </div>
          ) : (
            [...activeFences, ...inactiveFences].map((fence) => (
              <div
                key={fence.id}
                onClick={() => setSelected(fence)}
                className={`cursor-pointer rounded-[20px] border bg-[var(--bg-surface)] p-4 transition hover:border-[var(--border-strong)] ${
                  selected?.id === fence.id ? "border-[var(--accent-500)] ring-1 ring-[var(--accent-500)]/20" : ""
                } ${!fence.active ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[14px] font-semibold tracking-[-0.01em] text-[var(--fg-primary)]">
                        {fence.name}
                      </p>
                      <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${typeTone[fence.type] || typeTone.OTHER}`}>
                        {fence.type}
                      </span>
                    </div>
                    {fence.description && (
                      <p className="mt-0.5 truncate text-[11.5px] text-[var(--fg-tertiary)]">{fence.description}</p>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFence(fence); }}
                        className="rounded-lg p-1 text-[var(--fg-tertiary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--fg-primary)]"
                      >
                        {fence.active
                          ? <ToggleRight className="h-5 w-5 text-[var(--accent-500)]" />
                          : <ToggleLeft className="h-5 w-5" />}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteFence(fence); }}
                        className="rounded-lg p-1 text-[var(--fg-tertiary)] hover:bg-[var(--risk-high-bg)] hover:text-[var(--risk-high)]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 text-[12px]">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--fg-tertiary)]">Alert radius</p>
                    <p className="mt-0.5 font-semibold tabular-nums text-[var(--fg-primary)]">{fence.alert_radius_m}m</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--fg-tertiary)]">Status</p>
                    <p className={`mt-0.5 font-semibold ${fence.active ? "text-[var(--risk-low)]" : "text-[var(--fg-tertiary)]"}`}>
                      {fence.active ? "Active" : "Inactive"}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Map + detail */}
        <section className="surface-card rounded-[26px] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">
                {selected ? selected.name : "Bihar · all fences"}
              </h2>
              <p className="mt-1 text-[13px] text-[var(--fg-secondary)]">
                {selected
                  ? `${selected.type} · radius ${selected.alert_radius_m}m · ${selected.notify_roles.join(", ")}`
                  : "Select a fence to inspect details"}
              </p>
            </div>
            {selected && (
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${typeTone[selected.type] || typeTone.OTHER}`}>
                {selected.type}
              </span>
            )}
          </div>

          <div className="relative mt-4 h-[480px] overflow-hidden rounded-[20px] border">
            <HotspotsMap
              mode="dbscan"
              hotspots={[]}
              heatPoints={[]}
              districts={fencesGeoJson || districtsGeo}
              stateBoundary={stateBoundary}
              showDistrictShading={!fencesGeoJson}
            />
          </div>

          {selected && (
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { label: "Type", value: selected.type },
                { label: "Alert radius", value: `${selected.alert_radius_m}m` },
                { label: "Notify", value: selected.notify_roles.join(", ") },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-[16px] border bg-[var(--bg-subtle)] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--fg-tertiary)]">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--fg-primary)]">{value}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Create fence modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-[24px] bg-[var(--bg-surface)] p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-[var(--fg-primary)]">Create geo-fence</h2>
            <p className="mt-1 text-[12.5px] text-[var(--fg-tertiary)]">
              A default polygon boundary will be applied. Edit geometry via PostGIS or the map editor after creation.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--fg-tertiary)]">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Patna High Court"
                  className="h-10 w-full rounded-[12px] border bg-[var(--bg-subtle)] px-3 text-sm text-[var(--fg-primary)] outline-none focus:border-[var(--accent-500)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--fg-tertiary)]">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                  className="h-10 w-full rounded-[12px] border bg-[var(--bg-subtle)] px-3 text-sm text-[var(--fg-primary)] outline-none"
                >
                  {FENCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--fg-tertiary)]">Description</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Optional description"
                  className="h-10 w-full rounded-[12px] border bg-[var(--bg-subtle)] px-3 text-sm text-[var(--fg-primary)] outline-none focus:border-[var(--accent-500)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--fg-tertiary)]">Alert radius (metres)</label>
                <input
                  type="number"
                  value={form.alert_radius_m}
                  onChange={(e) => setForm((p) => ({ ...p, alert_radius_m: parseInt(e.target.value) || 500 }))}
                  className="h-10 w-full rounded-[12px] border bg-[var(--bg-subtle)] px-3 text-sm text-[var(--fg-primary)] outline-none focus:border-[var(--accent-500)]"
                />
              </div>
            </div>
            {createError && <p className="mt-3 text-sm text-[var(--risk-high)]">{createError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => { setShowCreate(false); setCreateError(null); }}
                className="rounded-[12px] border px-4 py-2 text-sm font-medium text-[var(--fg-secondary)]"
              >
                Cancel
              </button>
              <button
                onClick={createFence}
                disabled={creating || !form.name}
                className="rounded-[12px] bg-[var(--accent-500)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {creating ? "Creating…" : "Create fence"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
