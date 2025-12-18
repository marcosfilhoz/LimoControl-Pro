import { ensureEnv, env } from "./config/env";
import { createApp } from "./app";
import { initDbIfNeeded } from "./db/init";

ensureEnv();

(async () => {
  await initDbIfNeeded();
  const app = createApp();
  // Render (and most PaaS) require binding to 0.0.0.0 and using PORT env var.
  app.listen(env.port, "0.0.0.0", () => {
    console.log(`API running on 0.0.0.0:${env.port}`);
  });
})().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});

