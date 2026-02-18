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
    return res.status(502).json({
      success: false,
      message: error.message,
      data: null,
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
    return res.status(502).json({
      success: false,
      message: error.message,
      data: null,
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
    return res.status(502).json({
      success: false,
      message: error.message,
      data: null,
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
    return res.status(502).json({
      success: false,
      message: error.message,
      data: null,
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
    return res.status(502).json({
      success: false,
      message: error.message,
      data: null,
    });
  }
};