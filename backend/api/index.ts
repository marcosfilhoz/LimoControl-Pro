import type { IncomingMessage, ServerResponse } from "http";
import { createApp } from "../src/app";
import { initDbIfNeeded } from "../src/db/init";

const app = createApp();

let dbInitPromise: Promise<void> | null = null;
function ensureDbInit() {
  if (!dbInitPromise) {
    dbInitPromise = initDbIfNeeded().catch((err) => {
      console.error("DB init failed (Vercel):", err);
    }) as any;
  }
  return dbInitPromise;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await ensureDbInit();
  // Express can handle Node req/res directly
  return (app as any)(req, res);
}

