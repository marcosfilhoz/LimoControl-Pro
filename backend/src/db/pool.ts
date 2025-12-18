import { Pool } from "pg";
import { env } from "../config/env";

function shouldUseSsl(connectionString: string) {
  // In general, managed Postgres providers require SSL.
  // Local dev commonly does not.
  return !/localhost|127\.0\.0\.1/.test(connectionString);
}

export const pool: Pool | null = env.databaseUrl
  ? new Pool({
      connectionString: env.databaseUrl,
      ssl: shouldUseSsl(env.databaseUrl) ? { rejectUnauthorized: false } : undefined,
      // Avoid hanging forever on a bad/blocked DB connection in PaaS.
      connectionTimeoutMillis: 5000,
      // Prevent long/hung queries from blocking server startup forever.
      query_timeout: 15000,
      // Keep pool small/stable on small instances
      max: 5,
      idleTimeoutMillis: 30000,
      keepAlive: true,
    })
  : null;

// Log unexpected pool errors instead of crashing silently.
if (pool) {
  pool.on("error", (err) => {
    console.error("DB pool error:", err);
  });
}




