import { pool } from "../config/db.js";


export const healthCheck = async (req, res) => {
  await pool.query("SELECT 1");

  res.status(200).json(
    {
      success: true,
      message: "Backend healthy",
      data: {
        uptime: process.uptime(),
        timestamp: new Date(),
      },
    }
  );
};
