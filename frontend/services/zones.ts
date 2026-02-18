import { apiGet } from "./api";

export const fetchZones = async (token, params = {}) => {
  const search = new URLSearchParams(params).toString();
  const suffix = search ? `?${search}` : "";
  return apiGet(`/api/zones${suffix}`, token);
};