import { env } from "../utils/env.js";

const baseUrl = env.mlServiceUrl || "http://localhost:8001";

const callML = async (path, payload) => {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message =
      (data && (data.detail || data.message)) ||
      `ML service error (${res.status})`;
    throw new Error(message);
  }

  return data;
};

export const clusterIncidents = (payload) => callML("/cluster", payload);
export const kdeHotspots = (payload) => callML("/hotspots/kde", payload);
export const forecastSeries = (payload) => callML("/forecast", payload);
export const optimizeRoutes = (payload) => callML("/routes/optimize", payload);
export const riskScore = (payload) => callML("/risk-score", payload);