import { ensureEnv, env } from "./config/env";
import { createApp } from "./app";
import { initDbIfNeeded } from "./db/init";

ensureEnv();

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

(async () => {
  // Never block server start forever on DB issues.
  try {
    await initDbIfNeeded();
  } catch (err) {
    console.error("DB init failed (will continue without DB readiness):", err);
  }
  const app = createApp();
  // Render (and most PaaS) require binding to 0.0.0.0 and using PORT env var.
  app.listen(env.port, "0.0.0.0", () => {
    console.log(`API running on 0.0.0.0:${env.port}`);
  });
})().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});

