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
  fetchOfficerLeaderboard,
  fetchStationDistrictCrimeTotals,
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
    const clusterClusters = result.clusters?.clusters || [];
    const memberToCluster = new Map();
    for (const cluster of clusterClusters) {
      for (const memberId of cluster.member_ids || []) {
        memberToCluster.set(memberId, cluster.cluster_id);
      }
    }
    const points = (result.incidents || [])
      .filter((i) => i.latitude != null && i.longitude != null)
      .map((i) => ({
        id: i.id,
        x: Number(i.longitude),
        y: Number(i.latitude),
        label: i.crime_type || "Unknown",
        cluster_id: memberToCluster.get(i.id) || null,
      }));
    return res.status(200).json({
      success: true,
      message: "Behavioral clustering completed",
      data: { clusters: result.clusters, points },
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
    const scoreMap = new Map((result.scores || []).map((s) => [s.id, s.score]));
    const items = (result.items || []).map((item) => ({
      ...item,
      score: scoreMap.has(item.id) ? scoreMap.get(item.id) : 0,
    }));
    return res.status(200).json({
      success: true,
      message: "Risk scores generated successfully",
      data: { items },
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

export const getOfficerLeaderboardHandler = async (req, res) => {
  try {
    const { startDate, endDate, fromDate, toDate, limit } = req.query;
    const rows = await fetchOfficerLeaderboard({
      startDate: startDate || fromDate,
      endDate: endDate || toDate,
      limit: limit ? parseInt(limit, 10) : 5,
    });
    return res.status(200).json({
      success: true,
      message: "Officer leaderboard retrieved successfully",
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


export const getStationDistrictCrimeTotalsHandler = async (req, res) => {
  try {
    const { startDate, endDate, fromDate, toDate } = req.query;
    const data = await fetchStationDistrictCrimeTotals({
      startDate: startDate || fromDate,
      endDate: endDate || toDate,
    });
    return res.status(200).json({
      success: true,
      message: "Station and district crime totals retrieved successfully",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
      data: null,
    });
  }
};

