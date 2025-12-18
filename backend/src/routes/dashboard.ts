import { Router } from "express";
import type { AuthedRequest } from "../middleware/auth";
import { store } from "../store/store";

const router = Router();

router.get("/", (req, res) => {
  (async () => {
    const auth = (req as AuthedRequest).auth;
    const createdByUserId = auth?.role === "admin" ? undefined : auth?.userId;
    return res.json(await store.dashboard.summary({ createdByUserId }));
  })().catch((err) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });
});

export default router;

