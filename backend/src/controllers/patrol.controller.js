import {
  generatePatrolRoute,
  fetchPatrolRoutes,
  fetchPatrolRoute,
  buildPatrolSchedule,
  recordPatrolLog,
} from "../services/patrol.service.js";

export const generatePatrolHandler = async (req, res) => {
  try {
    const result = await generatePatrolRoute({
      ...req.body,
      userId: req.user?.id,
    });
    return res.status(201).json({
      success: true,
      message: "Patrol route generated",
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

export const listPatrolRoutesHandler = async (_req, res) => {
  try {
    const routes = await fetchPatrolRoutes();
    return res.status(200).json({
      success: true,
      message: "Patrol routes retrieved",
      data: routes,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
      data: null,
    });
  }
};

export const getPatrolRouteHandler = async (req, res) => {
  try {
    const route = await fetchPatrolRoute(req.params.id);
    return res.status(200).json({
      success: true,
      message: "Patrol route retrieved",
      data: route,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
      data: null,
    });
  }
};

export const getPatrolScheduleHandler = async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;
    const schedule = await buildPatrolSchedule({ type, startDate, endDate });
    return res.status(200).json({
      success: true,
      message: "Patrol schedule generated",
      data: schedule,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
      data: null,
    });
  }
};

export const createPatrolLogHandler = async (req, res) => {
  try {
    const data = await recordPatrolLog({ payload: req.body, officerId: req.user?.id });
    return res.status(201).json({
      success: true,
      message: "Patrol log recorded",
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
      data: null,
    });
  }
};
