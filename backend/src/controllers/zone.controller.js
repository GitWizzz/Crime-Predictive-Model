import { fetchZones } from "../services/zone.service.js";

export const listZones = async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;
    const result = await fetchZones({ startDate, endDate, type });
    return res.status(200).json({
      success: true,
      message: "Zones retrieved successfully",
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