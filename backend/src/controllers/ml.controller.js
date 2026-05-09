import {
  clusterIncidents,
  kdeHotspots,
  forecastSeries,
  optimizeRoutes,
  riskScore,
} from "../services/ml.service.js";

export const cluster = async (req, res) => {
  try {
    const result = await clusterIncidents(req.body);
    return res.status(200).json({
      success: true,
      message: "Clustering completed",
      data: result,
    });
  } catch (error) {
    return res.status(200).json({
      success: true,
      message: "Clustering fallback generated",
      data: {
        clusters: [],
        noise: req.body.incidents?.map((incident) => incident.id) || [],
        fallback_used: true,
        error: error.message,
      },
    });
  }
};

export const hotspotsKDE = async (req, res) => {
  try {
    const result = await kdeHotspots(req.body);
    return res.status(200).json({
      success: true,
      message: "KDE hotspots generated",
      data: result,
    });
  } catch (error) {
    const incidents = req.body.incidents || [];
    const maxWeight = Math.max(1, ...(req.body.weights || incidents.map((item) => item.severity || 1)));
    return res.status(200).json({
      success: true,
      message: "KDE fallback generated",
      data: {
        heat_points: incidents.map((incident, index) => ({
          lat: Number(incident.lat),
          lon: Number(incident.lon),
          intensity: Number(req.body.weights?.[index] || incident.severity || 1) / maxWeight,
        })),
        fallback_used: true,
        error: error.message,
      },
    });
  }
};

export const forecast = async (req, res) => {
  try {
    const result = await forecastSeries(req.body);
    return res.status(200).json({
      success: true,
      message: "Forecast generated",
      data: result,
    });
  } catch (error) {
    const series = req.body.series || req.body.time_series || [];
    const periods = Number(req.body.periods || 30);
    const values = series.map((point) => Number(point.y) || 0);
    const avg = values.slice(-7).reduce((sum, value) => sum + value, 0) / Math.max(1, Math.min(7, values.length));
    const lastDate = series.length ? new Date(series[series.length - 1].ds) : new Date();
    const points = [];
    for (let i = 1; i <= periods; i += 1) {
      const date = new Date(lastDate);
      date.setDate(lastDate.getDate() + i);
      points.push({
        ds: date.toISOString(),
        yhat: avg,
        yhat_lower: Math.max(0, avg * 0.85),
        yhat_upper: avg * 1.15,
      });
    }
    return res.status(200).json({
      success: true,
      message: "Forecast fallback generated",
      data: { points, fallback_used: true, error: error.message },
    });
  }
};

export const optimize = async (req, res) => {
  try {
    const result = await optimizeRoutes(req.body);
    return res.status(200).json({
      success: true,
      message: "Routes optimized",
      data: result,
    });
  } catch (error) {
    const stops = req.body.stops || [];
    return res.status(200).json({
      success: true,
      message: "Route optimization fallback generated",
      data: {
        routes: [{
          vehicle_id: 0,
          stop_order: stops.map((_, index) => index),
          distance_km: 0,
        }],
        fallback_used: true,
        error: error.message,
      },
    });
  }
};

export const risk = async (req, res) => {
  try {
    const result = await riskScore(req.body);
    return res.status(200).json({
      success: true,
      message: "Risk scores computed",
      data: result,
    });
  } catch (error) {
    return res.status(200).json({
      success: true,
      message: "Risk score fallback generated",
      data: {
        scores: (req.body.items || []).map((item) => ({
          id: item.id,
          score: Math.max(0, Math.min(100,
            Number(item.frequency || 0) * 0.35 +
            Number(item.severity || 1) * 8 +
            Number(item.hotspot_density || 0) * 0.1 +
            Number(item.repeat_rate || 0) * 0.2
          )),
        })),
        fallback_used: true,
        error: error.message,
      },
    });
  }
};
