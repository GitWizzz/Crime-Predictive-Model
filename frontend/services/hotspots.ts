import { apiGet, apiPost } from "./api";

export const fetchHotspots = async (token, params = {}) => {
  const search = new URLSearchParams(params).toString();
  const suffix = search ? `?${search}` : "";
  return apiGet(`/api/hotspots${suffix}`, token);
};

export const fetchFIRs = async (token, params = {}) => {
  const search = new URLSearchParams(params).toString();
  const suffix = search ? `?${search}` : "";
  return apiGet(`/api/fir${suffix}`, token);
};

export const createFIR = async (token, payload) => {
  return apiPost("/api/fir", payload, token);
};

export const bulkCreateFIRs = async (token, items) => {
  return apiPost("/api/fir/bulk", { items }, token);
};

export const fetchKDEHotspots = async (token, payload) => {
  return apiPost("/api/ml/hotspots/kde", payload, token);
};
