import express from "express";
import fs from "fs";
import path from "path";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const pkgPath = path.resolve("./package.json");
    let pkg = {};
    if (fs.existsSync(pkgPath)) {
      const raw = fs.readFileSync(pkgPath, "utf8");
      pkg = JSON.parse(raw);
    }

    res.json({
      name: pkg.name || "backend",
      version: pkg.version || "0.0.0",
    });
  } catch (err) {
    res.status(500).json({ error: "failed to read package metadata" });
  }
});

export default router;
