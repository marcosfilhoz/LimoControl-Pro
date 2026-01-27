import { Router } from "express";
import { z } from "zod";
import { store } from "../store/store";

const router = Router();

const vehicleSchema = z.object({
  name: z.string().min(2),
  brand: z.string().optional(),
  model: z.string().optional(),
  year: z.number().int().optional(),
  plate: z.string().optional(),
  companyId: z.string(),
});

const activeSchema = z.object({
  active: z.boolean(),
});

router.get("/", (_req, res) => {
  (async () => res.json(await store.vehicles.list()))().catch((err) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });
});

router.post("/", (req, res) => {
  (async () => {
    const parsed = vehicleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    if (!(await store.companies.exists(parsed.data.companyId))) {
      return res.status(400).json({ error: "Company not found" });
    }
    const vehicle = await store.vehicles.create(parsed.data as any);
    return res.status(201).json(vehicle);
  })().catch((err) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });
});

router.put("/:id", (req, res) => {
  (async () => {
    const parsed = vehicleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    if (!(await store.companies.exists(parsed.data.companyId))) {
      return res.status(400).json({ error: "Company not found" });
    }
    const out = await store.vehicles.update(req.params.id, parsed.data as any);
    if ("error" in out) return res.status(404).json({ error: out.error });
    return res.json(out.vehicle);
  })().catch((err) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });
});

router.patch("/:id/active", (req, res) => {
  (async () => {
    const parsed = activeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const out = await store.vehicles.setActive(req.params.id, parsed.data.active);
    if ("error" in out) return res.status(404).json({ error: out.error });
    return res.json(out.vehicle);
  })().catch((err) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });
});

router.delete("/:id", (req, res) => {
  (async () => {
    const out = await store.vehicles.delete(req.params.id);
    if ("error" in out) return res.status(out.conflict ? 409 : 404).json({ error: out.error });
    return res.json(out.vehicle);
  })().catch((err) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });
});

export default router;
