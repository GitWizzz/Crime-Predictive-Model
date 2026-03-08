import { apiPost } from "./api";

export const fetchForecast = async (
  token: string | null,
  payload: Record<string, unknown>
) => {
  return apiPost("/api/ml/forecast", payload, token);
};
