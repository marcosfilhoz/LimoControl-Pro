import { Router } from "express";
import { z } from "zod";
import type { AuthedRequest } from "../middleware/auth";
import { store } from "../store/store";

const router = Router();

const tripSchema = z.object({
  driverId: z.string(),
  // Preferred: select a registered client by id
  clientId: z.string().optional(),
  // Backward compatible: older clients send a free-text name
  clientName: z.string().optional(),
  clientPhone: z.string().optional(),
  companyId: z.string(),
  vehicleType: z.enum(["SUV", "Sedan", "Economy"]).nullable().optional(),
  cnf: z.string().optional(),
  flightNumber: z.string().optional(),
  meetGreet: z.string().optional(),
  startAt: z.string(),
  endAt: z.string(),
  origin: z.string(),
  destination: z.string(),
  stop: z.string().optional(),
  miles: z.number().nonnegative(),
  durationMinutes: z.number().nonnegative(),
  price: z.number().nonnegative(),
  received: z.boolean().optional(),
  notes: z.string().optional(),
});

const receivedSchema = z.object({
  received: z.boolean(),
});

router.get("/", (req, res) => {
  (async () => {
    const { driverId, clientId, companyId, cnf, flightNumber, meetGreet } = req.query as any;
    const auth = (req as AuthedRequest).auth;
    const filtered = await store.trips.list({
      createdByUserId: auth?.role === "admin" ? undefined : auth?.userId,
      driverId: driverId ? String(driverId) : undefined,
      clientId: clientId ? String(clientId) : undefined,
      companyId: companyId ? String(companyId) : undefined,
      cnf: cnf ? String(cnf) : undefined,
      flightNumber: flightNumber ? String(flightNumber) : undefined,
      // Backward compatible:
      // - meetGreet=true/false filters by presence
      // - meetGreet=<text> filters by substring match
      meetGreet:
        typeof meetGreet === "string"
          ? meetGreet === "true"
            ? true
            : meetGreet === "false"
              ? false
              : String(meetGreet)
          : undefined,
    });
    return res.json(filtered);
  })().catch((err) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });
});

router.post("/", (req, res) => {
  (async () => {
    const parsed = tripSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const { driverId, companyId } = parsed.data;
    if (!(await store.drivers.exists(driverId))) return res.status(400).json({ error: "Driver not found" });
    if (!(await store.companies.exists(companyId))) return res.status(400).json({ error: "Company not found" });

    let clientId: string | null = null;
    if (parsed.data.clientId && parsed.data.clientId.trim()) {
      const id = parsed.data.clientId.trim();
      if (!(await store.clients.exists(id))) return res.status(400).json({ error: "Client not found" });
      clientId = id;
    } else {
      const clientName = (parsed.data.clientName || "").trim();
      const client = clientName ? await store.clients.ensureByName(clientName) : null;
      clientId = client?.id ?? null;
    }
    const createdByUserId = (req as AuthedRequest).auth?.userId || "unknown";
    const trip = await store.trips.create({ ...parsed.data, clientId } as any, createdByUserId);
    return res.status(201).json(trip);
  })().catch((err) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });
});

router.put("/:id", (req, res) => {
  (async () => {
    const auth = (req as AuthedRequest).auth;
    if (!auth) return res.status(401).json({ error: "Unauthorized" });
    if (auth.role !== "admin") {
      const existing = await store.trips.get(req.params.id);
      if (!existing) return res.status(404).json({ error: "Trip not found" });
      if (existing.createdByUserId !== auth.userId) return res.status(403).json({ error: "Forbidden" });
    }

    const parsed = tripSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const { driverId, companyId } = parsed.data;
    if (!(await store.drivers.exists(driverId))) return res.status(400).json({ error: "Driver not found" });
    if (!(await store.companies.exists(companyId))) return res.status(400).json({ error: "Company not found" });

    let clientId: string | null = null;
    if (parsed.data.clientId && parsed.data.clientId.trim()) {
      const id = parsed.data.clientId.trim();
      if (!(await store.clients.exists(id))) return res.status(400).json({ error: "Client not found" });
      clientId = id;
    } else {
      const clientName = (parsed.data.clientName || "").trim();
      const client = clientName ? await store.clients.ensureByName(clientName) : null;
      clientId = client?.id ?? null;
    }
    const out = await store.trips.update(req.params.id, { ...parsed.data, clientId } as any);
    if ("error" in out) return res.status(404).json({ error: out.error });
    return res.json(out.trip);
  })().catch((err) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });
});

router.patch("/:id/received", (req, res) => {
  (async () => {
    const auth = (req as AuthedRequest).auth;
    if (!auth) return res.status(401).json({ error: "Unauthorized" });
    if (auth.role !== "admin") {
      const existing = await store.trips.get(req.params.id);
      if (!existing) return res.status(404).json({ error: "Trip not found" });
      if (existing.createdByUserId !== auth.userId) return res.status(403).json({ error: "Forbidden" });
    }

    const parsed = receivedSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const out = await store.trips.setReceived(req.params.id, parsed.data.received);
    if ("error" in out) return res.status(404).json({ error: out.error });
    return res.json(out.trip);
  })().catch((err) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });
});

router.delete("/:id", (req, res) => {
  (async () => {
    const auth = (req as AuthedRequest).auth;
    if (!auth) return res.status(401).json({ error: "Unauthorized" });
    if (auth.role !== "admin") {
      const existing = await store.trips.get(req.params.id);
      if (!existing) return res.status(404).json({ error: "Trip not found" });
      if (existing.createdByUserId !== auth.userId) return res.status(403).json({ error: "Forbidden" });
    }

    const out = await store.trips.delete(req.params.id);
    if ("error" in out) return res.status(out.conflict ? 409 : 404).json({ error: out.error });
    return res.json(out.trip);
  })().catch((err) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });
});

export default router;

