import { apiPost } from "./api";

export const fetchForecast = async (
  token: string | null,
  payload: Record<string, unknown>
) => {
  return apiPost("/api/ml/forecast", payload, token);
};

export const fetchRiskScore = async (
  token: string | null,
  payload: Record<string, unknown>
) => {
  return apiPost("/api/ml/risk-score", payload, token);
};

export const fetchClusterIncidents = async (
  token: string | null,
  payload: Record<string, unknown>
) => {
  return apiPost("/api/ml/cluster", payload, token);
};

