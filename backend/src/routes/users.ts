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
  role: z.enum(["admin", "user", "driver", "dev"]).default("user"),
  driverId: z.string().optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(["admin", "user", "driver", "dev"]).optional(),
  driverId: z.string().nullable().optional(),
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

    // Validate that driver role requires driverId
    if (parsed.data.role === "driver" && !parsed.data.driverId) {
      return res.status(400).json({ error: "Driver role requires a driverId" });
    }

    // Validate that driverId exists if provided
    if (parsed.data.driverId) {
      const driverExists = await store.drivers.exists(parsed.data.driverId);
      if (!driverExists) {
        return res.status(400).json({ error: "Driver not found" });
      }
    }

    const out = await store.users.create({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
      role: parsed.data.role as Role,
      driverId: parsed.data.driverId,
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

    // If role is being set to "driver", validate driverId
    if (parsed.data.role === "driver") {
      // If driverId is explicitly set to null, that's an error
      if (parsed.data.driverId === null) {
        return res.status(400).json({ error: "Driver role requires a driverId" });
      }
      // If driverId is not provided, check if user already has one
      if (parsed.data.driverId === undefined) {
        const currentUsers = await store.users.listSafe();
        const currentUser = currentUsers.find((u) => u.id === req.params.id);
        if (!currentUser) return res.status(404).json({ error: "User not found" });
        // If current user doesn't have driverId and role is being changed to driver, require it
        if (!currentUser.driverId) {
          return res.status(400).json({ error: "Driver role requires a driverId" });
        }
      }
    }

    // Validate that driverId exists if provided
    if (parsed.data.driverId) {
      const driverExists = await store.drivers.exists(parsed.data.driverId);
      if (!driverExists) {
        return res.status(400).json({ error: "Driver not found" });
      }
    }

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

