import { apiGet, apiPost } from "./api";

type QueryParams = Record<string, string | number>;
const toSearch = (params: QueryParams) =>
  new URLSearchParams(
    Object.fromEntries(
      Object.entries(params).map(([key, value]) => [key, String(value)])
    )
  ).toString();

export const fetchHotspots = async (token: string | null, params: QueryParams = {}) => {
  const search = toSearch(params);
  const suffix = search ? `?${search}` : "";
  return apiGet(`/api/hotspots${suffix}`, token);
};

export const fetchFIRs = async (token: string | null, params: QueryParams = {}) => {
  const search = toSearch(params);
  const suffix = search ? `?${search}` : "";
  return apiGet(`/api/fir${suffix}`, token);
};

export const createFIR = async (token: string | null, payload: Record<string, unknown>) => {
  return apiPost("/api/fir", payload, token);
};

export const bulkCreateFIRs = async (token: string | null, items: unknown[]) => {
  return apiPost("/api/fir/bulk", { items }, token);
};

export const fetchKDEHotspots = async (token: string | null, payload: Record<string, unknown>) => {
  return apiPost("/api/ml/hotspots/kde", payload, token);
};
