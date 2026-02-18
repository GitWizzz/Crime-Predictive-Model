import { apiGet, apiPost } from "./api";

export const fetchIradHotspots = async (token, params = {}) => {
  const search = new URLSearchParams(params).toString();
  const suffix = search ? `?${search}` : "";
  return apiGet(`/api/irad/hotspots${suffix}`, token);
};

export const fetchIradAccidents = async (token, params = {}) => {
  const search = new URLSearchParams(params).toString();
  const suffix = search ? `?${search}` : "";
  return apiGet(`/api/irad${suffix}`, token);
};

export const ingestIradAccidents = async (token, items) => {
  return apiPost(`/api/irad/ingest`, { items }, token);
};
