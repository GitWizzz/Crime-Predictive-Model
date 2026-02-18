"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { bulkCreateFIRs, fetchFIRs, createFIR } from "@/services/hotspots";

const initialFilters = {
  crime_type: "",
  act_type: "",
  section_code: "",
  zone: "",
  police_station: "",
  startDate: "",
  endDate: "",
};

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
};

export default function FIRsPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [firs, setFirs] = useState<FIR[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [newFir, setNewFir] = useState({
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
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      setToken(window.localStorage.getItem("authToken"));
    }
  }, []);

  const params = useMemo(() => {
    return Object.fromEntries(
      Object.entries({
        ...filters,
        page,
        limit,
      }).filter(([, value]) => value !== "" && value !== null && value !== undefined)
    );
  }, [filters, page, limit]);

  const loadFIRs = async (overrideParams) => {
    if (!token) {
      setError("Missing auth token. Set localStorage key authToken after login.");
      return;
    }

    setLoading(true);
    setError(null);
    setImportMessage(null);
    try {
      const res = await fetchFIRs(token, overrideParams || params);
      setFirs(res.data?.items || []);
      setTotal(res.data?.total || 0);
      setPage(res.data?.page || page);
      setLimit(res.data?.limit || limit);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load FIRs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadFIRs();
    }
  }, [token, page, limit]);

  const handleChange = (key) => (event) => {
    setFilters((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const handleApply = () => {
    loadFIRs(params);
  };

  const handleReset = () => {
    setFilters(initialFilters);
    setPage(1);
    loadFIRs({});
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!token) {
      setError("Missing auth token. Set localStorage key authToken after login.");
      return;
    }

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
      await loadFIRs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk import failed.");
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  const handleCreate = async () => {
    if (!token) {
      setError("Missing auth token. Set localStorage key authToken after login.");
      return;
    }
    setLoading(true);
    setError(null);
    setCreateMessage(null);
    try {
      const payload = {
        ...newFir,
        latitude: Number(newFir.latitude),
        longitude: Number(newFir.longitude),
      };
      await createFIR(token, payload);
      setCreateMessage("FIR created successfully.");
      setNewFir({
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
      });
      await loadFIRs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create FIR.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-white p-4 space-y-3">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-700">Add FIR (CCTNS Style)</h3>
          <div className="grid gap-3 md:grid-cols-6">
            <Input
              placeholder="FIR No"
              value={newFir.fir_no}
              onChange={(e) => setNewFir((prev) => ({ ...prev, fir_no: e.target.value }))}
            />
            <Input
              placeholder="Crime Type"
              value={newFir.crime_type}
              onChange={(e) => setNewFir((prev) => ({ ...prev, crime_type: e.target.value }))}
            />
            <Input
              placeholder="Act (IPC/NDPS)"
              value={newFir.act_type}
              onChange={(e) => setNewFir((prev) => ({ ...prev, act_type: e.target.value }))}
            />
            <Input
              placeholder="Section"
              value={newFir.section_code}
              onChange={(e) => setNewFir((prev) => ({ ...prev, section_code: e.target.value }))}
            />
            <Input
              placeholder="Category"
              value={newFir.category}
              onChange={(e) => setNewFir((prev) => ({ ...prev, category: e.target.value }))}
            />
            <Input
              type="number"
              placeholder="Severity (1-5)"
              value={newFir.severity}
              onChange={(e) => setNewFir((prev) => ({ ...prev, severity: Number(e.target.value) }))}
              min={1}
              max={5}
            />
            <Input
              type="datetime-local"
              value={newFir.date_time}
              onChange={(e) => setNewFir((prev) => ({ ...prev, date_time: e.target.value }))}
            />
            <Input
              placeholder="Latitude"
              value={newFir.latitude}
              onChange={(e) => setNewFir((prev) => ({ ...prev, latitude: e.target.value }))}
            />
            <Input
              placeholder="Longitude"
              value={newFir.longitude}
              onChange={(e) => setNewFir((prev) => ({ ...prev, longitude: e.target.value }))}
            />
            <Input
              placeholder="Police Station"
              value={newFir.police_station}
              onChange={(e) => setNewFir((prev) => ({ ...prev, police_station: e.target.value }))}
            />
            <Input
              placeholder="Zone/District"
              value={newFir.zone}
              onChange={(e) => setNewFir((prev) => ({ ...prev, zone: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleCreate} disabled={loading}>
              {loading ? "Saving..." : "Create FIR"}
            </Button>
            {createMessage && (
              <span className="text-sm text-emerald-600">{createMessage}</span>
            )}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-7">
          <Input
            placeholder="Crime type"
            value={filters.crime_type}
            onChange={handleChange("crime_type")}
          />
          <Input
            placeholder="Act (IPC/NDPS)"
            value={filters.act_type}
            onChange={handleChange("act_type")}
          />
          <Input
            placeholder="Section"
            value={filters.section_code}
            onChange={handleChange("section_code")}
          />
          <Input
            placeholder="Zone"
            value={filters.zone}
            onChange={handleChange("zone")}
          />
          <Input
            placeholder="Police station"
            value={filters.police_station}
            onChange={handleChange("police_station")}
          />
          <Input
            type="date"
            value={filters.startDate}
            onChange={handleChange("startDate")}
          />
          <Input
            type="date"
            value={filters.endDate}
            onChange={handleChange("endDate")}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleApply} disabled={loading}>
            {loading ? "Loading..." : "Apply Filters"}
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={loading}>
            Reset
          </Button>
          <div className="ml-auto flex items-center gap-2 text-sm text-zinc-500">
            <span>Rows:</span>
            <select
              className="rounded border px-2 py-1 text-sm"
              value={limit}
              onChange={(event) => {
                setLimit(Number(event.target.value));
                setPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-zinc-600">
            Bulk import FIRs (JSON array)
          </label>
          <input
            type="file"
            accept=".json,application/json"
            onChange={handleImport}
            className="text-sm"
            disabled={loading}
          />
          {importMessage && (
            <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {importMessage}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-lg border bg-white">
        <div className="border-b px-4 py-2 text-sm text-zinc-500">
          Showing {firs.length} of {total} FIR records
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3">FIR No</th>
                <th className="px-4 py-3">Crime Type</th>
                <th className="px-4 py-3">Act</th>
                <th className="px-4 py-3">Section</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Date/Time</th>
                <th className="px-4 py-3">Station</th>
                <th className="px-4 py-3">Zone</th>
                <th className="px-4 py-3">Lat</th>
                <th className="px-4 py-3">Lon</th>
              </tr>
            </thead>
            <tbody>
              {firs.map((fir) => (
                <tr key={fir.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{fir.fir_no}</td>
                  <td className="px-4 py-3">{fir.crime_type}</td>
                  <td className="px-4 py-3">{fir.act_type || "-"}</td>
                  <td className="px-4 py-3">{fir.section_code || fir.section || "-"}</td>
                  <td className="px-4 py-3">{fir.category || "-"}</td>
                  <td className="px-4 py-3">{fir.severity ?? "-"}</td>
                  <td className="px-4 py-3">
                    {fir.date_time
                      ? new Date(fir.date_time).toLocaleString()
                      : "-"}
                  </td>
                  <td className="px-4 py-3">{fir.police_station || "-"}</td>
                  <td className="px-4 py-3">{fir.zone || "-"}</td>
                  <td className="px-4 py-3">{fir.latitude?.toFixed?.(5) ?? fir.latitude}</td>
                  <td className="px-4 py-3">{fir.longitude?.toFixed?.(5) ?? fir.longitude}</td>
                </tr>
              ))}
              {firs.length === 0 && !loading && (
                <tr>
                  <td className="px-4 py-6 text-center text-sm text-zinc-500" colSpan={12}>
                    No FIR records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-zinc-600">
        <span>
          Page {page} of {Math.max(1, Math.ceil(total / limit))}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(total / limit) || loading}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
