import app from "./app.js";
import { env } from "./utils/env.js";

app.listen(env.PORT, () => {
  console.log(`Backend running on port ${env.PORT}`);
});
