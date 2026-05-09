import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { onEvent } from "../utils/eventBus.js";

const router = express.Router();

const streamEvents = (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`);

  const send = (evt) => {
    res.write(`event: ${evt.type}\n`);
    res.write(`data: ${JSON.stringify(evt)}\n\n`);
  };

  const unsubscribe = onEvent(send);

  req.on("close", () => {
    unsubscribe();
  });
};

router.get("/stream", protect, streamEvents);
router.get("/subscribe", protect, streamEvents);

export default router;
