import { Router } from "express";
import { z } from "zod";
import { requireRole } from "../middleware/auth";
import { store } from "../store/store";

const router = Router();

const updateSchema = z.object({
  ownerCompanyId: z.string().nullable().optional(),
  logoDataUrl: z.string().nullable().optional(),
  enabledModules: z.array(z.string()).optional(),
  pdfCompany: z.string().nullable().optional(),
  pdfEmail: z.string().nullable().optional(),
  pdfPhone: z.string().nullable().optional(),
});

router.get("/", (_req, res) => {
  (async () => res.json(await store.settings.get()))().catch((err) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });
});

router.put("/", (req, res) => {
  requireRole("dev")(req, res, () => {
  (async () => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    if (parsed.data.ownerCompanyId) {
      const exists = await store.companies.exists(parsed.data.ownerCompanyId);
      if (!exists) return res.status(400).json({ error: "Company not found" });
    }
    const settings = await store.settings.update(parsed.data);
    return res.json(settings);
  })().catch((err) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });
  });
});

export default router;
