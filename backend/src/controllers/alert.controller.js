import {
  fetchAlertDetailAndMarkRead,
  fetchAlerts,
  markAlertAsRead,
} from "../services/alert.service.js";

export const listAlertsHandler = async (req, res) => {
  try {
    const data = await fetchAlerts({ user: req.user, filters: req.query });
    return res.status(200).json({
      success: true,
      message: "Alerts fetched successfully",
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

export const getAlertHandler = async (req, res) => {
  try {
    const data = await fetchAlertDetailAndMarkRead({
      id: req.params.id,
      userId: req.user.id,
    });
    return res.status(200).json({
      success: true,
      message: "Alert fetched successfully",
      data,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
      data: null,
    });
  }
};

export const markAlertReadHandler = async (req, res) => {
  try {
    const data = await markAlertAsRead({
      id: req.params.id,
      userId: req.user.id,
    });
    return res.status(200).json({
      success: true,
      message: data.message,
      data,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
      data: null,
    });
  }
};
