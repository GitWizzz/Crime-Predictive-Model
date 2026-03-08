import { apiGet } from "./api";

type QueryParams = Record<string, string>;

export const fetchZones = async (token: string | null, params: QueryParams = {}) => {
  const search = new URLSearchParams(params).toString();
  const suffix = search ? `?${search}` : "";
  return apiGet(`/api/zones${suffix}`, token);
};
