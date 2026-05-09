import { listAuditLogs } from "../models/auditLog.model.js";

export const listAuditLogsHandler = async (req, res) => {
  try {
    const data = await listAuditLogs(req.query);
    return res.status(200).json({
      success: true,
      message: "Audit logs fetched successfully",
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
