"use client";

import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  MoreHorizontal,
  Plus,
  Search,
  Upload,
  X,
} from "lucide-react";
import { bulkCreateFIRs, createFIR, fetchFIRs } from "@/services/hotspots";

type FIR = {
  id: number;
  fir_no: string;
  crime_type: string;
  section?: string;
  act_type?: string;
  section_code?: string;
  severity?: number;
  category?: string;
  date_time?: string;
  police_station?: string;
  zone?: string;
  latitude?: number;
  longitude?: number;
  status?: string;
  victim_name?: string;
  victim_gender?: string;
  officer_name?: string;
};

type FIRQueryParams = Record<string, string | number>;

type AuthUser = {
  name?: string;
  email?: string;
  role?: string;
  zone?: string;
  policeStation?: string;
  police_station?: string;
};

type CreateFirState = {
  fir_no: string;
  crime_type: string;
  act_type: string;
  section_code: string;
  category: string;
  severity: number;
  date_time: string;
  latitude: string;
  longitude: string;
  police_station: string;
  zone: string;
};

const initialCreateState: CreateFirState = {
  fir_no: "",
  crime_type: "",
  act_type: "",
  section_code: "",
  category: "",
  severity: 3,
  date_time: "",
  latitude: "",
  longitude: "",
  police_station: "",
  zone: "",
};

const buildInitialCreateState = (user?: AuthUser | null): CreateFirState => {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  const station = user?.policeStation || user?.police_station || "";
  const zone = user?.zone || (station.includes("Patna") ? "Patna Central" : "");

  return {
    ...initialCreateState,
    fir_no: `FIR-${stamp}`,
    date_time: new Date(Date.now() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16),
    police_station: station,
    zone,
  };
};

const FilterSection = ({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) => (
  <details className="group rounded-[16px] border">
    <summary className="flex h-10 cursor-pointer list-none items-center justify-between px-3 text-[12.5px] font-medium text-[var(--fg-primary)] transition hover:bg-[var(--bg-subtle)]">
      {label}
      <ChevronDown className="h-3.5 w-3.5 text-[var(--fg-tertiary)] transition group-open:rotate-180" />
    </summary>
    <div className="space-y-2 border-t px-3 py-3">
      {options.map((option) => (
        <label
          key={option}
          className="flex items-center gap-2 text-[12.5px] text-[var(--fg-secondary)]"
        >
          <input
            type="checkbox"
            checked={selected.includes(option)}
            onChange={() => onToggle(option)}
            className="h-4 w-4 accent-[var(--accent-500)]"
          />
          <span>{option}</span>
        </label>
      ))}
    </div>
  </details>
);

const statusTone = (status: string) => {
  if (status === "escalated") return "bg-[var(--risk-high-bg)] text-[var(--risk-high)]";
  if (status === "closed") return "bg-[var(--bg-subtle)] text-[var(--fg-tertiary)]";
  return "bg-[var(--accent-50)] text-[var(--accent-700)]";
};

const riskDot = (severity?: number) => {
  if ((severity || 0) >= 4) return "bg-[var(--risk-high)]";
  if ((severity || 0) >= 3) return "bg-[var(--risk-medium)]";
  return "bg-[var(--risk-low)]";
};

const formatDate = (value?: string) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

const normalizeStatus = (fir: FIR) => {
  const raw = fir.status?.toLowerCase();
  if (raw === "closed" || raw === "escalated" || raw === "open") return raw;
  if ((fir.severity || 0) >= 5) return "escalated";
  if ((fir.severity || 0) <= 2) return "closed";
  return "open";
};

const buildCsv = (rows: FIR[]) => {
  const headers = ["FIR No", "Date", "Crime Type", "Section", "Zone", "Status", "Station"];
  const lines = rows.map((fir) =>
    [
      fir.fir_no,
      fir.date_time || "",
      fir.crime_type || "",
      fir.section_code || fir.section || "",
      fir.zone || "",
      normalizeStatus(fir),
      fir.police_station || "",
    ]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(",")
  );

  return [headers.join(","), ...lines].join("\n");
};

export default function FIRsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [token] = useState<string | null>(() =>
    typeof window !== "undefined" ? window.localStorage.getItem("authToken") : null
  );
  const [authUser] = useState<AuthUser | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = window.localStorage.getItem("authUser");
      return stored ? (JSON.parse(stored) as AuthUser) : null;
    } catch {
      return null;
    }
  });
  const [firs, setFirs] = useState<FIR[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilters, setStatusFilters] = useState<string[]>(["Open (live)"]);
  const [crimeFilters, setCrimeFilters] = useState<string[]>([]);
  const [zoneFilters, setZoneFilters] = useState<string[]>([]);
  const [dateFilters, setDateFilters] = useState<string[]>(["Last 7 days"]);
  const [registeredByFilters, setRegisteredByFilters] = useState<string[]>([]);
  const [victimGenderFilters, setVictimGenderFilters] = useState<string[]>([]);
  const [attachmentFilters, setAttachmentFilters] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [newFir, setNewFir] = useState<CreateFirState>(() => buildInitialCreateState(authUser));
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const queryComposeOpen = searchParams.get("compose") === "1";
  const composeOpen = queryComposeOpen;

  const MapPicker = dynamic(() => import("@/components/map/MapPicker"), { ssr: false });

  const MapPickerWrapper = () => (
    // show MapPicker with current coordinates; updates `newFir` when user picks position
    <MapPicker
      lat={newFir.latitude ? Number(newFir.latitude) : undefined}
      lng={newFir.longitude ? Number(newFir.longitude) : undefined}
      onChange={(lat, lng) => setNewFir((current) => ({ ...current, latitude: String(lat.toFixed(6)), longitude: String(lng.toFixed(6)) }))}
    />
  );

  useEffect(() => {
    const loadFIRs = async () => {
      if (!token) return;

      const params: FIRQueryParams = { page, limit };
      if (dateFilters.includes("Last 7 days")) {
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);
        params.startDate = startDate;
      } else if (dateFilters.includes("Last 30 days")) {
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);
        params.startDate = startDate;
      }
      if (crimeFilters.length === 1) params.crime_type = crimeFilters[0];
      if (zoneFilters.length === 1) params.zone = zoneFilters[0];

      setLoading(true);
      setError(null);
      setImportMessage(null);

      try {
        const res = await fetchFIRs(token, params);
        setFirs((res.data?.items || []) as FIR[]);
        setTotal(res.data?.total || 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load FIRs");
      } finally {
        setLoading(false);
      }
    };

    loadFIRs();
  }, [token, page, limit, crimeFilters, zoneFilters, dateFilters]);

  const toggleFilter = (value: string, setter: Dispatch<SetStateAction<string[]>>) => {
    setter((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  };

  const displayFirs = useMemo(() => {
    return firs.filter((fir) => {
      const normalizedStatus = normalizeStatus(fir);
      const haystack = [
        fir.fir_no,
        fir.crime_type,
        fir.zone,
        fir.police_station,
        fir.victim_name,
        fir.officer_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !search.trim() || haystack.includes(search.trim().toLowerCase());
      const matchesStatus =
        statusFilters.length === 0 ||
        statusFilters.some((filter) =>
          filter.toLowerCase().includes(normalizedStatus)
        );
      const matchesCrime =
        crimeFilters.length === 0 || crimeFilters.includes(fir.crime_type || "");
      const matchesZone = zoneFilters.length === 0 || zoneFilters.includes(fir.zone || "");
      const matchesVictimGender =
        victimGenderFilters.length === 0 ||
        victimGenderFilters.includes(fir.victim_gender || "Other / unknown");

      return matchesSearch && matchesStatus && matchesCrime && matchesZone && matchesVictimGender;
    });
  }, [crimeFilters, firs, search, statusFilters, victimGenderFilters, zoneFilters]);

  useEffect(() => {
    setSelectedRows((current) => current.filter((id) => displayFirs.some((fir) => fir.id === id)));
  }, [displayFirs]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const uniqueCrimeTypes = Array.from(new Set(firs.map((fir) => fir.crime_type).filter((x): x is string => Boolean(x)))).sort();
  const uniqueZones = Array.from(new Set(firs.map((fir) => fir.zone).filter((x): x is string => Boolean(x)))).sort();
  const activeChips = [
    ...statusFilters.map((item) => ({ label: `Status: ${item.replace(" (live)", "").toLowerCase()}`, clear: () => setStatusFilters((current) => current.filter((value) => value !== item)) })),
    ...crimeFilters.map((item) => ({ label: `Type: ${item.toLowerCase()}`, clear: () => setCrimeFilters((current) => current.filter((value) => value !== item)) })),
    ...zoneFilters.map((item) => ({ label: `Zone: ${item}`, clear: () => setZoneFilters((current) => current.filter((value) => value !== item)) })),
  ];

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !token) return;

    setLoading(true);
    setError(null);
    setImportMessage(null);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const items = Array.isArray(parsed) ? parsed : parsed.items;

      if (!Array.isArray(items) || items.length === 0) {
        throw new Error("JSON must be an array of FIR objects.");
      }

      const res = await bulkCreateFIRs(token, items);
      const inserted = res.data?.inserted ?? 0;
      const skipped = res.data?.skipped ?? 0;
      setImportMessage(`Imported ${inserted} FIRs. Skipped ${skipped}.`);
      setPage(1);
      const refresh = await fetchFIRs(token, { page: 1, limit });
      setFirs((refresh.data?.items || []) as FIR[]);
      setTotal(refresh.data?.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk import failed.");
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  const handleExport = () => {
    const csv = buildCsv(displayFirs);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "firs-export.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCreate = async () => {
    if (!token) {
      setError("Missing auth token. Set localStorage key authToken after login.");
      return;
    }

    if (!newFir.crime_type || !newFir.date_time || !newFir.police_station || !newFir.zone) {
      setError("Crime type, date & time, police station, and zone are required.");
      return;
    }

    setLoading(true);
    setError(null);
    setCreateMessage(null);

    try {
      await createFIR(token, {
        ...newFir,
        latitude: newFir.latitude ? Number(newFir.latitude) : undefined,
        longitude: newFir.longitude ? Number(newFir.longitude) : undefined,
      });
      setCreateMessage("FIR created successfully.");
      setNewFir(buildInitialCreateState(authUser));
      if (queryComposeOpen) {
        router.replace(pathname);
      }
      setPage(1);
      const refresh = await fetchFIRs(token, { page: 1, limit });
      setFirs((refresh.data?.items || []) as FIR[]);
      setTotal(refresh.data?.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create FIR.");
    } finally {
      setLoading(false);
    }
  };

  const openCompose = () => {
    setCreateMessage(null);
    setError(null);
    setNewFir(buildInitialCreateState(authUser));
    router.replace(`${pathname}?compose=1`);
  };

  const closeCompose = () => {
    setError(null);
    setNewFir(buildInitialCreateState(authUser));
    if (queryComposeOpen) {
      router.replace(pathname);
    }
  };

  if (composeOpen) {
    return (
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-3 py-4 md:px-4 md:py-6">
        <div className="surface-card flex min-h-[calc(100vh-2rem)] flex-1 flex-col rounded-[24px] p-5 md:p-6">
          <div className="mb-4 flex items-center justify-between gap-4 border-b pb-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--fg-tertiary)]">Register FIR</p>
                <div className="h-1.5 w-[1px] bg-[var(--border-default)]/50" />
                <div className="text-xs text-[var(--fg-tertiary)]">Quick entry</div>
              </div>
              <h1 className="mt-2 text-[24px] font-semibold tracking-[-0.02em] text-[var(--fg-primary)] truncate">Create a new incident report</h1>
              <p className="mt-1 text-[13px] text-[var(--fg-secondary)]">Enter core details, pick location, then review before saving.</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={closeCompose} className="rounded-lg border bg-[var(--bg-surface)] px-3 py-2 text-sm font-medium text-[var(--fg-primary)] transition hover:bg-[var(--bg-subtle)]">Close</button>
            </div>
          </div>

          <div className="grid flex-1 gap-6 xl:grid-cols-[1.5fr_0.75fr]">
            <div className="space-y-5">
              <div className="rounded-[14px] border bg-[var(--bg-surface)] p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[var(--fg-primary)]">Core details</h2>
                  <div className="text-xs text-[var(--fg-tertiary)]">Required *</div>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {[
                    { key: "fir_no", label: "FIR no", required: true },
                    { key: "crime_type", label: "Crime type", required: true, placeholder: "Theft, Assault, Burglary..." },
                    { key: "date_time", label: "Date & time", type: "datetime-local", required: true },
                    { key: "severity", label: "Severity", select: true },
                    { key: "police_station", label: "Police station", required: true },
                    { key: "zone", label: "Zone", required: true },
                  ].map((field) => (
                    <label key={field.key} className="space-y-1 text-sm">
                      <div className="flex items-center justify-between text-[13px] text-[var(--fg-secondary)]">
                        <span>{field.label}{field.required ? " *" : ""}</span>
                      </div>
                      {field.select ? (
                        <select value={newFir.severity} onChange={(event) => setNewFir((current) => ({ ...current, severity: Number(event.target.value) }))} className="h-11 w-full rounded-[10px] border bg-[var(--bg-surface)] px-3 text-sm text-[var(--fg-primary)] outline-none transition focus:border-[var(--accent-400)]">
                          <option value={1}>1 · Low</option>
                          <option value={2}>2 · Guarded</option>
                          <option value={3}>3 · Moderate</option>
                          <option value={4}>4 · High</option>
                          <option value={5}>5 · Critical</option>
                        </select>
                      ) : (
                        <input type={field.type || "text"} placeholder={field.placeholder} value={newFir[field.key as keyof CreateFirState] as string} onChange={(event) => setNewFir((current) => ({ ...current, [field.key]: event.target.value }))} className="h-11 w-full rounded-[10px] border bg-[var(--bg-surface)] px-3 text-sm text-[var(--fg-primary)] outline-none transition focus:border-[var(--accent-400)]" />
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-[14px] border bg-[var(--bg-surface)] p-4">
                <h3 className="text-sm font-semibold text-[var(--fg-primary)]">Location</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {[{ key: "latitude", label: "Latitude", placeholder: "25.5941" }, { key: "longitude", label: "Longitude", placeholder: "85.1376" }].map((field) => (
                    <label key={field.key} className="space-y-1 text-sm">
                      <div className="text-[13px] text-[var(--fg-secondary)]">{field.label}</div>
                      <input type="text" placeholder={field.placeholder} value={newFir[field.key as keyof CreateFirState] as string} onChange={(event) => setNewFir((current) => ({ ...current, [field.key]: event.target.value }))} className="h-11 w-full rounded-[10px] border bg-[var(--bg-surface)] px-3 text-sm text-[var(--fg-primary)] outline-none transition focus:border-[var(--accent-400)]" />
                    </label>
                  ))}
                </div>
                <div className="mt-3 text-sm text-[var(--fg-tertiary)]">Use the map on the right to pick a precise location.</div>
              </div>

              <div className="rounded-[14px] border bg-[var(--bg-surface)] p-4">
                <h3 className="text-sm font-semibold text-[var(--fg-primary)]">Classification</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {[{ key: "act_type", label: "Act", placeholder: "IPC / NDPS / IT Act" }, { key: "section_code", label: "Section", placeholder: "379 / 354A / 457..." }, { key: "category", label: "Category", placeholder: "Property, Violent, Safety...", wide: true }].map((field) => (
                    <label key={field.key} className={`${field.wide ? "md:col-span-2" : ""} space-y-1 text-sm`}>
                      <div className="text-[13px] text-[var(--fg-secondary)]">{field.label}</div>
                      <input type="text" placeholder={field.placeholder} value={newFir[field.key as keyof CreateFirState] as string} onChange={(event) => setNewFir((current) => ({ ...current, [field.key]: event.target.value }))} className="h-11 w-full rounded-[10px] border bg-[var(--bg-surface)] px-3 text-sm text-[var(--fg-primary)] outline-none transition focus:border-[var(--accent-400)]" />
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <div className="rounded-[14px] border bg-[var(--bg-subtle)] p-3">
                  <div className="h-40 w-full overflow-hidden rounded-[10px]">
                    {/* MapPicker is dynamically imported to avoid SSR issues */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <MapPickerWrapper />
                  </div>
                <div className="mt-3 space-y-3">
                  <div className="rounded-[10px] border bg-[var(--bg-surface)] p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--fg-secondary)]">Crime type</span>
                      <span className="font-medium text-[var(--fg-primary)]">{newFir.crime_type || "Not set"}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[var(--fg-secondary)]">Police station</span>
                      <span className="font-medium text-[var(--fg-primary)]">{newFir.police_station || "Not set"}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[var(--fg-secondary)]">Zone</span>
                      <span className="font-medium text-[var(--fg-primary)]">{newFir.zone || "Not set"}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[var(--fg-secondary)]">Severity</span>
                      <span className="font-medium text-[var(--fg-primary)]">{newFir.severity}/5</span>
                    </div>
                  </div>

                  <div className="rounded-[10px] border bg-[var(--bg-surface)] p-3 text-sm text-[var(--fg-secondary)]">
                    Exact coordinates improve hotspot quality and patrol routing. Coordinates are optional.
                  </div>
                </div>
              </div>

              <div className="mt-auto flex flex-col gap-3">
                <div className="text-sm text-[var(--fg-tertiary)]">{createMessage ? createMessage : "Required: crime type, date & time, police station, zone."}</div>
                <div className="flex w-full gap-3">
                  <button onClick={closeCompose} className="flex-1 h-11 rounded-[10px] border bg-[var(--bg-surface)] text-sm font-medium text-[var(--fg-primary)]">Cancel</button>
                  <button onClick={handleCreate} disabled={loading} className="flex-1 h-11 rounded-[10px] bg-[var(--accent-500)] text-sm font-semibold text-white">{loading ? "Saving..." : "Create FIR"}</button>
                </div>
                <button onClick={() => {}} className="w-full text-sm text-[var(--fg-tertiary)]">Save draft</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] space-y-5">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleImport}
        className="hidden"
      />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">
            FIRs
            <span className="ml-2 text-[16px] font-medium text-[var(--fg-tertiary)]">
              {loading ? "Loading..." : `${total.toLocaleString("en-IN")} results`}
            </span>
          </h1>
          <p className="mt-1 text-[13px] text-[var(--fg-secondary)]">
            All First Information Reports across your jurisdiction
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex h-10 items-center gap-2 rounded-[14px] border bg-[var(--bg-surface)] px-4 text-sm font-medium text-[var(--fg-primary)]"
          >
            <Upload className="h-4 w-4" />
            Bulk import
          </button>
          <button
            onClick={handleExport}
            className="inline-flex h-10 items-center gap-2 rounded-[14px] border bg-[var(--bg-surface)] px-4 text-sm font-medium text-[var(--fg-primary)]"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={openCompose}
            className="inline-flex h-10 items-center gap-2 rounded-[14px] bg-[var(--accent-500)] px-4 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            Register FIR
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-[20px] border border-[var(--risk-high)]/20 bg-[var(--risk-high-bg)] px-4 py-3 text-sm text-[var(--risk-high)]">
          {error}
        </div>
      ) : null}

      {importMessage ? (
        <div className="rounded-[20px] border border-[var(--risk-low)]/20 bg-[var(--risk-low-bg)] px-4 py-3 text-sm text-[var(--risk-low)]">
          {importMessage}
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
        <div className="space-y-3">
          <div className="surface-card rounded-[22px] p-3">
            <div className="mb-3 text-sm font-semibold text-[var(--fg-primary)]">Filters</div>
            <div className="space-y-2">
              <FilterSection
                label="Status"
                options={["Open (live)", "Escalated", "Closed"]}
                selected={statusFilters}
                onToggle={(value) => toggleFilter(value, setStatusFilters)}
              />
              <FilterSection
                label="Crime type"
                options={uniqueCrimeTypes.length ? uniqueCrimeTypes : ["Theft", "Burglary", "Assault", "Vehicle theft"]}
                selected={crimeFilters}
                onToggle={(value) => toggleFilter(value, setCrimeFilters)}
              />
              <FilterSection
                label="Zone"
                options={uniqueZones.length ? uniqueZones : ["Patna Central", "Patna Sadar", "Bhagalpur", "Gaya Town"]}
                selected={zoneFilters}
                onToggle={(value) => toggleFilter(value, setZoneFilters)}
              />
              <FilterSection
                label="Date range"
                options={["Today", "Last 7 days", "Last 30 days", "Custom..."]}
                selected={dateFilters}
                onToggle={(value) =>
                  setDateFilters((current) =>
                    current.includes(value) ? current.filter((item) => item !== value) : [value]
                  )
                }
              />
              <FilterSection
                label="Registered by"
                options={["Self", "My team", "Any officer"]}
                selected={registeredByFilters}
                onToggle={(value) => toggleFilter(value, setRegisteredByFilters)}
              />
              <FilterSection
                label="Victim gender"
                options={["Female", "Male", "Other / unknown"]}
                selected={victimGenderFilters}
                onToggle={(value) => toggleFilter(value, setVictimGenderFilters)}
              />
              <FilterSection
                label="Attachments"
                options={["Has photos", "Has documents", "Any"]}
                selected={attachmentFilters}
                onToggle={(value) => toggleFilter(value, setAttachmentFilters)}
              />
            </div>
            <button
              onClick={() => {
                setStatusFilters([]);
                setCrimeFilters([]);
                setZoneFilters([]);
                setDateFilters([]);
                setRegisteredByFilters([]);
                setVictimGenderFilters([]);
                setAttachmentFilters([]);
              }}
              className="mt-3 text-[12px] font-medium text-[var(--accent-600)]"
            >
              Reset all
            </button>
          </div>
        </div>

        <div className="min-w-0 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--fg-tertiary)]" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search FIR no, description, location, victim name..."
                className="h-10 w-full rounded-[14px] border bg-[var(--bg-surface)] pl-10 pr-24 text-[13px] text-[var(--fg-primary)] outline-none transition focus:border-[var(--accent-400)]"
              />
              <kbd className="absolute right-3 top-1/2 inline-flex h-5 -translate-y-1/2 items-center rounded border bg-[var(--bg-subtle)] px-1.5 text-[10.5px] text-[var(--fg-tertiary)]">
                Ctrl K
              </kbd>
            </div>
            <button className="inline-flex h-10 items-center gap-2 rounded-[14px] border bg-[var(--bg-surface)] px-4 text-sm font-medium text-[var(--fg-primary)]">
              <Calendar className="h-4 w-4" />
              {dateFilters[0] || "Last 7 days"}
            </button>
            <button className="grid h-10 w-10 place-items-center rounded-[14px] border bg-[var(--bg-surface)] text-[var(--fg-secondary)]">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--fg-tertiary)]">
              Active
            </span>
            {activeChips.map((chip) => (
              <button
                key={chip.label}
                onClick={chip.clear}
                className="inline-flex items-center gap-2 rounded-full border bg-[var(--bg-surface)] px-3 py-1.5 text-xs text-[var(--fg-primary)]"
              >
                {chip.label}
                <X className="h-3 w-3 text-[var(--fg-tertiary)]" />
              </button>
            ))}
            {activeChips.length ? (
              <button
                onClick={() => {
                  setStatusFilters([]);
                  setCrimeFilters([]);
                  setZoneFilters([]);
                }}
                className="text-[12px] text-[var(--fg-tertiary)] transition hover:text-[var(--fg-primary)]"
              >
                Clear all
              </button>
            ) : null}
          </div>

          <div className="surface-card overflow-hidden rounded-[22px] p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b bg-[var(--bg-subtle)]/70">
                  <tr className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--fg-tertiary)]">
                    <th className="w-8 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={displayFirs.length > 0 && selectedRows.length === displayFirs.length}
                        onChange={(event) =>
                          setSelectedRows(event.target.checked ? displayFirs.map((fir) => fir.id) : [])
                        }
                        className="h-4 w-4 accent-[var(--accent-500)]"
                      />
                    </th>
                    <th className="px-2 py-3">FIR no</th>
                    <th className="px-2 py-3">Date</th>
                    <th className="px-2 py-3">Crime type</th>
                    <th className="px-2 py-3">Section</th>
                    <th className="px-2 py-3">Zone</th>
                    <th className="px-2 py-3">Status</th>
                    <th className="px-2 py-3">Victim</th>
                    <th className="px-2 py-3">Officer</th>
                    <th className="w-8 px-2 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {displayFirs.map((fir) => {
                    const status = normalizeStatus(fir);
                    return (
                      <tr
                        key={fir.id}
                        className="border-b last:border-0 hover:bg-[var(--bg-subtle)]/40"
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(fir.id)}
                            onChange={() =>
                              setSelectedRows((current) =>
                                current.includes(fir.id)
                                  ? current.filter((item) => item !== fir.id)
                                  : [...current, fir.id]
                              )
                            }
                            className="h-4 w-4 accent-[var(--accent-500)]"
                          />
                        </td>
                        <td className="px-2 py-3">
                          <span className="font-mono text-[12.5px] text-[var(--fg-primary)]">
                            {fir.fir_no}
                          </span>
                        </td>
                        <td className="px-2 py-3 text-[12.5px] tabular-nums text-[var(--fg-secondary)]">
                          {formatDate(fir.date_time)}
                        </td>
                        <td className="px-2 py-3">
                          <div className="inline-flex items-center gap-2 text-[13px] text-[var(--fg-primary)]">
                            <span className={`h-1.5 w-1.5 rounded-full ${riskDot(fir.severity)}`} />
                            {fir.crime_type || "-"}
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          <span className="font-mono text-[11.5px] text-[var(--fg-tertiary)]">
                            {fir.section_code || fir.section || "-"}
                          </span>
                        </td>
                        <td className="px-2 py-3 text-[13px] text-[var(--fg-secondary)]">
                          {fir.zone || "-"}
                        </td>
                        <td className="px-2 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusTone(status)}`}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="px-2 py-3 text-[13px] text-[var(--fg-secondary)]">
                          {fir.victim_name || "Unknown victim"}
                        </td>
                        <td className="px-2 py-3 text-[13px] text-[var(--fg-secondary)]">
                          {fir.officer_name || fir.police_station || "Assigned officer"}
                        </td>
                        <td className="px-2 py-3 text-[var(--fg-tertiary)]">
                          <MoreHorizontal className="h-4 w-4" />
                        </td>
                      </tr>
                    );
                  })}

                  {displayFirs.length === 0 && !loading ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-10 text-center text-sm text-[var(--fg-tertiary)]">
                        No FIR records found for the current filters.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-[12.5px] text-[var(--fg-tertiary)]">
              <span>
                Showing {displayFirs.length ? `${(page - 1) * limit + 1}-${(page - 1) * limit + displayFirs.length}` : "0"}
                {" "}of {total.toLocaleString("en-IN")}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1 || loading}
                  className="grid h-8 w-8 place-items-center rounded-[10px] text-[var(--fg-secondary)] transition hover:bg-[var(--bg-subtle)] disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {[page, Math.min(page + 1, totalPages), Math.min(page + 2, totalPages)]
                  .filter((value, index, array) => array.indexOf(value) === index)
                  .map((value) => (
                    <button
                      key={value}
                      onClick={() => setPage(value)}
                      className={`min-w-8 rounded-[10px] px-2 py-1 text-[12px] ${
                        value === page
                          ? "bg-[var(--accent-50)] font-semibold text-[var(--accent-700)]"
                          : "text-[var(--fg-secondary)] transition hover:bg-[var(--bg-subtle)]"
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                {page + 2 < totalPages ? <span className="px-1">…</span> : null}
                {page + 2 < totalPages ? (
                  <button
                    onClick={() => setPage(totalPages)}
                    className="min-w-8 rounded-[10px] px-2 py-1 text-[12px] text-[var(--fg-secondary)] transition hover:bg-[var(--bg-subtle)]"
                  >
                    {totalPages}
                  </button>
                ) : null}
                <button
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page >= totalPages || loading}
                  className="grid h-8 w-8 place-items-center rounded-[10px] text-[var(--fg-secondary)] transition hover:bg-[var(--bg-subtle)] disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="inline-flex items-center gap-1.5">
                Rows
                <select
                  value={limit}
                  onChange={(event) => {
                    setLimit(Number(event.target.value));
                    setPage(1);
                  }}
                  className="h-7 rounded border bg-[var(--bg-surface)] px-2 text-[12px]"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
