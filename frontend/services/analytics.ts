import { apiGet, apiPost } from "./api";

export const fetchZoneAnalytics = async (token, params = {}) => {
  const search = new URLSearchParams(params).toString();
  const suffix = search ? `?${search}` : "";
  return apiGet(`/api/analytics/zones${suffix}`, token);
};

export const fetchSeasonalTrends = async (token, params = {}) => {
  const search = new URLSearchParams(params).toString();
  const suffix = search ? `?${search}` : "";
  return apiGet(`/api/analytics/seasonal${suffix}`, token);
};

export const fetchForecast = async (token, params = {}) => {
  const search = new URLSearchParams(params).toString();
  const suffix = search ? `?${search}` : "";
  return apiGet(`/api/analytics/forecast${suffix}`, token);
};

export const fetchBehavioral = async (token, payload = {}) => {
  return apiPost(`/api/analytics/behavioral`, payload, token);
};

export const fetchWomenSafety = async (token, params = {}) => {
  const search = new URLSearchParams(params).toString();
  const suffix = search ? `?${search}` : "";
  return apiGet(`/api/analytics/women-safety${suffix}`, token);
};

export const fetchRiskScores = async (token, params = {}) => {
  const search = new URLSearchParams(params).toString();
  const suffix = search ? `?${search}` : "";
  return apiGet(`/api/analytics/risk${suffix}`, token);
};
