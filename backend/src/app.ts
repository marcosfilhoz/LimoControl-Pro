import cors from "cors";
import express from "express";
import helmet from "helmet";
import authRouter from "./routes/auth";
import clientsRouter from "./routes/clients";
import companiesRouter from "./routes/companies";
import dashboardRouter from "./routes/dashboard";
import driversRouter from "./routes/drivers";
import tripsRouter from "./routes/trips";
import usersRouter from "./routes/users";
import { requireAuth } from "./middleware/auth";
import { env } from "./config/env";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet());

  const origins = env.corsOrigin
    ? env.corsOrigin
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  app.use(
    cors({
      origin: origins.length ? origins : true,
    })
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Friendly landing page (public) for browsers / uptime checks
  app.get("/", (_req, res) => {
    res.json({
      name: "LimoControl API",
      status: "ok",
      health: "/health",
      login: "POST /auth/login",
    });
  });

  app.use("/auth", authRouter);

  // everything below requires authentication
  app.use(requireAuth);
  app.use("/users", usersRouter);
  app.use("/drivers", driversRouter);
  app.use("/clients", clientsRouter);
  app.use("/companies", companiesRouter);
  app.use("/trips", tripsRouter);
  app.use("/dashboard", dashboardRouter);

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}


