import { apiGet, apiPost } from "./api";

type QueryParams = Record<string, string>;

export const fetchIradHotspots = async (token: string | null, params: QueryParams = {}) => {
  const search = new URLSearchParams(params).toString();
  const suffix = search ? `?${search}` : "";
  return apiGet(`/api/irad/hotspots${suffix}`, token);
};

export const fetchIradAccidents = async (token: string | null, params: QueryParams = {}) => {
  const search = new URLSearchParams(params).toString();
  const suffix = search ? `?${search}` : "";
  return apiGet(`/api/irad${suffix}`, token);
};

export const ingestIradAccidents = async (token: string | null, items: unknown[]) => {
  return apiPost(`/api/irad/ingest`, { items }, token);
};
