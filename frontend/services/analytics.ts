import { apiGet, apiPost } from "./api";

type QueryParams = Record<string, string | number>;
const toSearch = (params: QueryParams) =>
  new URLSearchParams(
    Object.fromEntries(
      Object.entries(params).map(([key, value]) => [key, String(value)])
    )
  ).toString();

export const fetchZoneAnalytics = async (token: string | null, params: QueryParams = {}) => {
  const search = toSearch(params);
  const suffix = search ? `?${search}` : "";
  return apiGet(`/api/analytics/zones${suffix}`, token);
};

export const fetchSeasonalTrends = async (token: string | null, params: QueryParams = {}) => {
  const search = toSearch(params);
  const suffix = search ? `?${search}` : "";
  return apiGet(`/api/analytics/seasonal${suffix}`, token);
};

export const fetchForecast = async (token: string | null, params: QueryParams = {}) => {
  const search = toSearch(params);
  const suffix = search ? `?${search}` : "";
  return apiGet(`/api/analytics/forecast${suffix}`, token);
};

export const fetchBehavioral = async (
  token: string | null,
  payload: Record<string, unknown> = {}
) => {
  return apiPost(`/api/analytics/behavioral`, payload, token);
};

export const fetchWomenSafety = async (token: string | null, params: QueryParams = {}) => {
  const search = toSearch(params);
  const suffix = search ? `?${search}` : "";
  return apiGet(`/api/analytics/women-safety${suffix}`, token);
};

export const fetchRiskScores = async (token: string | null, params: QueryParams = {}) => {
  const search = toSearch(params);
  const suffix = search ? `?${search}` : "";
  return apiGet(`/api/analytics/risk${suffix}`, token);
};
