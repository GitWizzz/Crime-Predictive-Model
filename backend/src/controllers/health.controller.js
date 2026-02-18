import { pool } from "../config/db.js";


export const healthCheck = async (req, res) => {
  try {
    await pool.query("SELECT 1");

    return res.status(200).json({
      success: true,
      message: "Backend healthy",
      data: {
        uptime: process.uptime(),
        timestamp: new Date(),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Health check failed",
      data: null,
    });
  }
};
