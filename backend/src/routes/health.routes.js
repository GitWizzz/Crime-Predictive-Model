import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
  return res.json({
    success: true,
    message: "Backend API is running",
    data: null
  });
});

export default router;
