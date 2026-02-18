import {
  fetchZoneAnalytics,
  fetchSeasonalTrends,
  buildForecast,
  runBehavioralClustering,
  runWomenSafetyHotspots,
  runRiskScoring,
} from "../services/analytics.service.js";

export const getZoneAnalyticsHandler = async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;
    const rows = await fetchZoneAnalytics({ type, startDate, endDate });
    return res.status(200).json({
      success: true,
      message: "Zone analytics retrieved successfully",
      data: rows,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
      data: null,
    });
  }
};

export const getSeasonalTrendsHandler = async (req, res) => {
  try {
    const { granularity, startDate, endDate } = req.query;
    const rows = await fetchSeasonalTrends({ granularity, startDate, endDate });
    return res.status(200).json({
      success: true,
      message: "Seasonal trends retrieved successfully",
      data: rows,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
      data: null,
    });
  }
};

export const getForecastHandler = async (req, res) => {
  try {
    const { interval, startDate, endDate, periods, freq } = req.query;
    const result = await buildForecast({
      interval,
      startDate,
      endDate,
      periods,
      freq,
    });
    return res.status(200).json({
      success: true,
      message: "Forecast generated successfully",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
      data: null,
    });
  }
};

export const postBehavioralHandler = async (req, res) => {
  try {
    const result = await runBehavioralClustering(req.body || {});
    return res.status(200).json({
      success: true,
      message: "Behavioral clustering completed",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
      data: null,
    });
  }
};

export const getWomenSafetyHandler = async (req, res) => {
  try {
    const result = await runWomenSafetyHotspots(req.query);
    return res.status(200).json({
      success: true,
      message: "Women safety hotspots generated successfully",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
      data: null,
    });
  }
};

export const getRiskHandler = async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;
    const result = await runRiskScoring({ type, startDate, endDate });
    return res.status(200).json({
      success: true,
      message: "Risk scores generated successfully",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
      data: null,
    });
  }
};
