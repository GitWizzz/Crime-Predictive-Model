import { createAuditLog } from "../models/audit.model.js";

const isMutating = (method) => ["POST", "PUT", "PATCH", "DELETE"].includes(method);

export const auditMiddleware = (req, res, next) => {
  if (!isMutating(req.method)) {
    return next();
  }

  const start = Date.now();
  res.on("finish", async () => {
    try {
      const action = `${req.method} ${req.originalUrl}`;
      const entity = req.audit?.entity || req.path.split("/")[1] || "unknown";
      const entity_id = req.audit?.entity_id || null;
      const metadata = {
        status: res.statusCode,
        duration_ms: Date.now() - start,
        query: req.query,
      };
      await createAuditLog({
        user_id: req.user?.id,
        action,
        entity,
        entity_id,
        metadata,
        ip_address: req.ip,
      });
    } catch {
      
    }
  });

  next();
};
