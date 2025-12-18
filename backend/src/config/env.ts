import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT) || 4000,
  databaseUrl: process.env.DATABASE_URL || "",
  jwtSecret: process.env.JWT_SECRET || "change-me",
  corsOrigin: process.env.CORS_ORIGIN || "",
  seedAdminEmail: process.env.SEED_ADMIN_EMAIL || "",
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD || "",
};

export function ensureEnv() {
  if (!env.jwtSecret || env.jwtSecret === "change-me") {
    console.warn("JWT_SECRET is not set. Set a strong secret in env.");
  }
  if (!env.databaseUrl) {
    console.warn("DATABASE_URL not provided. API will run with in-memory data.");
  }
  if (!env.corsOrigin) {
    console.warn("CORS_ORIGIN not set. API will allow any origin (development-friendly, not ideal for production).");
  }
}

