import {
  fetchZoneAnalytics,
  fetchSeasonalTrends,
  buildForecast,
  runBehavioralClustering,
  runWomenSafetyHotspots,
  runRiskScoring,
  fetchWomenSafetyFIRs,
  compareZones,
  buildHeatmapTimeline,
  exportFIRsCsv,
} from "../services/analytics.service.js";

export const getZoneAnalyticsHandler = async (req, res) => {
  try {
    const { type, startDate, endDate, fromDate, toDate } = req.query;
    const rows = await fetchZoneAnalytics({ type, startDate: startDate || fromDate, endDate: endDate || toDate });
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
    const { granularity, startDate, endDate, fromDate, toDate } = req.query;
    const rows = await fetchSeasonalTrends({ granularity, startDate: startDate || fromDate, endDate: endDate || toDate });
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
    const { interval, startDate, endDate, fromDate, toDate, periods, freq } = req.query;
    const result = await buildForecast({
      interval,
      startDate: startDate || fromDate,
      endDate: endDate || toDate,
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
    const { type, startDate, endDate, fromDate, toDate } = req.query;
    const result = await runRiskScoring({ type, startDate: startDate || fromDate, endDate: endDate || toDate });
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

export const getWomenSafetyFIRsHandler = async (req, res) => {
  try {
    const result = await fetchWomenSafetyFIRs(req.query);
    return res.status(200).json({
      success: true,
      message: "Women safety FIRs retrieved successfully",
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

export const getCompareHandler = async (req, res) => {
  try {
    const result = await compareZones(req.query);
    return res.status(200).json({
      success: true,
      message: "Zone comparison retrieved successfully",
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

export const getHeatmapTimelineHandler = async (req, res) => {
  try {
    const result = await buildHeatmapTimeline(req.query);
    return res.status(200).json({
      success: true,
      message: "Heatmap timeline retrieved successfully",
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

export const exportCsvHandler = async (req, res) => {
  try {
    const csv = await exportFIRsCsv(req.query);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=\"firs-export.csv\"");
    return res.status(200).send(csv);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
      data: null,
    });
  }
};
