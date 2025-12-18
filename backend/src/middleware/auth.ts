import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export type AuthedRequest = Request & {
  auth?: { userId: string; role: string };
};

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.header("authorization") || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Missing Bearer token" });
  }
  try {
    const payload = jwt.verify(token, env.jwtSecret) as { sub?: string; role?: string };
    if (!payload?.sub) {
      return res.status(401).json({ error: "Invalid token" });
    }
    req.auth = { userId: payload.sub, role: payload.role || "user" };
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function requireRole(role: string) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.auth) return res.status(401).json({ error: "Unauthorized" });
    if (req.auth.role !== role) return res.status(403).json({ error: "Forbidden" });
    return next();
  };
}



