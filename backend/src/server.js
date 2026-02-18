import app from "./app.js";
import { connectDB } from "./config/db.js";
import { env } from "./utils/env.js";
import { validateEnv } from "./utils/validateEnv.js";

import { initDB } from "./models/init.js";

const startServer = async () => {
  validateEnv();
  await connectDB();
  if (env.initDbOnStart === "true") {
    await initDB();
  }

  app.listen(env.port, () => {
    console.log(`🚀 Server running on port ${env.port}`);
  });
};

startServer();
