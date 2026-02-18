import { apiPost } from "./api";

export const fetchForecast = async (token, payload) => {
  return apiPost("/api/ml/forecast", payload, token);
};