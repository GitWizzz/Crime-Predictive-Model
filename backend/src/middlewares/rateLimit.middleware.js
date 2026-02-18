const buckets = new Map();

export const rateLimit = ({ windowMs = 60_000, max = 120 } = {}) => {
  return (req, res, next) => {
    const key = req.ip || req.headers["x-forwarded-for"] || "unknown";
    const now = Date.now();
    const entry = buckets.get(key) || { count: 0, start: now };

    if (now - entry.start > windowMs) {
      entry.count = 0;
      entry.start = now;
    }

    entry.count += 1;
    buckets.set(key, entry);

    if (entry.count > max) {
      return res.status(429).json({
        success: false,
        message: "Rate limit exceeded. Try again later.",
        data: null,
      });
    }

    next();
  };
};
