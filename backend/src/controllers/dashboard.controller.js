import { fetchMobileDashboardSummary } from "../services/dashboard.service.js";

export const getMobileDashboardSummaryHandler = async (req, res) => {
  try {
    const data = await fetchMobileDashboardSummary({
      requestedZone: req.query.zone,
      user: req.user,
    });
    return res.status(200).json({
      success: true,
      message: "Dashboard summary fetched successfully",
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
