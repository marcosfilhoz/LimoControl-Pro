import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth";
import type { Role, User } from "../store/types";
import { store } from "../store/store";

const router = Router();

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["admin", "user"]).default("user"),
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(["admin", "user"]).optional(),
});

function safeUser(u: User) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt };
}

router.use(requireAuth, requireRole("admin"));

router.get("/", (_req, res) => {
  (async () => res.json(await store.users.listSafe()))().catch((err) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });
});

router.post("/", (req, res) => {
  (async () => {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const out = await store.users.create({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
      role: parsed.data.role as Role,
    });
    if ("error" in out) return res.status(409).json({ error: out.error });
    return res.status(201).json(out.user);
  })().catch((err) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });
});

router.put("/:id", (req, res) => {
  (async () => {
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const out = await store.users.update(req.params.id, parsed.data as any);
    if ("error" in out) return res.status(404).json({ error: out.error });
    return res.json(out.user);
  })().catch((err) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });
});

router.post("/:id/reset-password", (req, res) => {
  (async () => {
    const out = await store.users.resetPassword(req.params.id, "admin");
    if ("error" in out) return res.status(404).json({ error: out.error });
    return res.json({ ok: true });
  })().catch((err) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });
});

router.delete("/:id", (req, res) => {
  (async () => {
    const out = await store.users.delete(req.params.id);
    if ("error" in out) return res.status(out.conflict ? 409 : 404).json({ error: out.error });
    return res.json(out.user);
  })().catch((err) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });
});

export default router;

