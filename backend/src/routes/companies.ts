import { Router } from "express";
import { z } from "zod";
import { store } from "../store/store";

const router = Router();

const companySchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
});

const activeSchema = z.object({
  active: z.boolean(),
});

router.get("/", (_req, res) => {
  (async () => res.json(await store.companies.list()))().catch((err) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });
});

router.post("/", (req, res) => {
  (async () => {
    const parsed = companySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const company = await store.companies.create(parsed.data);
    return res.status(201).json(company);
  })().catch((err) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });
});

router.put("/:id", (req, res) => {
  (async () => {
    const parsed = companySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const out = await store.companies.update(req.params.id, parsed.data);
    if ("error" in out) return res.status(404).json({ error: out.error });
    return res.json(out.company);
  })().catch((err) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });
});

router.patch("/:id/active", (req, res) => {
  (async () => {
    const parsed = activeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const out = await store.companies.setActive(req.params.id, parsed.data.active);
    if ("error" in out) return res.status(404).json({ error: out.error });
    return res.json(out.company);
  })().catch((err) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });
});

router.delete("/:id", (req, res) => {
  (async () => {
    const out = await store.companies.delete(req.params.id);
    if ("error" in out) return res.status(out.conflict ? 409 : 404).json({ error: out.error });
    return res.json(out.company);
  })().catch((err) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });
});

export default router;


