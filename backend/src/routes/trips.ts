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
  tripType: z.enum(["transfer", "hourly"]).optional(),
  hourlyStartTime: z.string().optional(),
  hourlyEndTime: z.string().optional(),
  vehicleType: z.enum(["SUV", "Sedan", "Economy", "First Class"]).nullable().optional(),
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
    
    // If user is a driver, filter by their linked driver
    let filterDriverId = driverId ? String(driverId) : undefined;
    if (auth?.role === "driver" && !filterDriverId) {
      console.log(`[Trips] Looking up driver user: ${auth.userId}`);
      const user = await store.users.findById(auth.userId);
      console.log(`[Trips] Found user:`, user ? { id: user.id, name: user.name, role: user.role, driverId: user.driverId } : null);
      if (user?.driverId) {
        filterDriverId = user.driverId;
        console.log(`[Trips] Driver user ${auth.userId} (${user.name}) linked to driver ${filterDriverId}`);
      } else {
        console.log(`[Trips] Driver user ${auth.userId} has no driverId linked. User data:`, user);
        // If driver user has no driverId linked, return empty array
        return res.json([]);
      }
    }
    
    // For drivers, don't filter by createdByUserId - they should see all trips for their linked driver
    // For admin and user, don't filter by createdByUserId either (they see all trips)
    // Only filter by createdByUserId for non-admin, non-user, non-driver roles (shouldn't happen)
    const filterCreatedByUserId = 
      auth?.role === "admin" || auth?.role === "user" || auth?.role === "driver" 
        ? undefined 
        : auth?.userId;
    
    console.log(`[Trips] Listing trips with filters:`, {
      role: auth?.role,
      userId: auth?.userId,
      filterDriverId,
      filterCreatedByUserId,
    });
    
    const filtered = await store.trips.list({
      createdByUserId: filterCreatedByUserId,
      driverId: filterDriverId,
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
    console.log(`[Trips] Found ${filtered.length} trips`);
    if (filtered.length === 0 && filterDriverId) {
      // Debug: check if there are any trips for this driver at all
      const allTripsForDriver = await store.trips.list({ driverId: filterDriverId });
      console.log(`[Trips] Debug: Total trips for driver ${filterDriverId}: ${allTripsForDriver.length}`);
      // Also check all trips to see what driverIds exist
      const allTrips = await store.trips.list({});
      const uniqueDriverIds = [...new Set(allTrips.map(t => t.driverId))];
      console.log(`[Trips] Debug: All driverIds in trips:`, uniqueDriverIds);
      console.log(`[Trips] Debug: Looking for driverId: ${filterDriverId}, exists in trips: ${uniqueDriverIds.includes(filterDriverId)}`);
    }
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

// Helper function to check if user can update trip status
async function canUpdateTripStatus(tripId: string, auth: any): Promise<{ allowed: boolean; trip?: any }> {
  const trip = await store.trips.get(tripId);
  if (!trip) return { allowed: false };
  
  // Admins can update any trip
  if (auth.role === "admin") return { allowed: true, trip };
  
  // Drivers can only update their own trips
  if (auth.role === "driver") {
    // Get user by ID to check driverId
    const allUsers = await store.users.listSafe();
    const user = allUsers.find((u) => u.id === auth.userId);
    if (!user || !user.driverId) return { allowed: false, trip };
    if (trip.driverId !== user.driverId) return { allowed: false, trip };
    return { allowed: true, trip };
  }
  
  // Other users can update trips they created
  if (trip.createdByUserId === auth.userId) return { allowed: true, trip };
  
  return { allowed: false, trip };
}

router.patch("/:id/start", (req, res) => {
  (async () => {
    const auth = (req as AuthedRequest).auth;
    if (!auth) return res.status(401).json({ error: "Unauthorized" });
    
    const { allowed, trip } = await canUpdateTripStatus(req.params.id, auth);
    if (!allowed) return res.status(403).json({ error: "Forbidden" });
    if (trip!.status !== "pending") return res.status(400).json({ error: "Trip must be pending to start" });
    
    const out = await store.trips.update(req.params.id, { status: "in_progress" } as any);
    if ("error" in out) return res.status(404).json({ error: out.error });
    return res.json(out.trip);
  })().catch((err) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });
});

router.patch("/:id/pause", (req, res) => {
  (async () => {
    const auth = (req as AuthedRequest).auth;
    if (!auth) return res.status(401).json({ error: "Unauthorized" });
    
    const { allowed, trip } = await canUpdateTripStatus(req.params.id, auth);
    if (!allowed) return res.status(403).json({ error: "Forbidden" });
    if (trip!.status !== "in_progress") return res.status(400).json({ error: "Trip must be in progress to pause" });
    
    const out = await store.trips.update(req.params.id, { status: "on_stop" } as any);
    if ("error" in out) return res.status(404).json({ error: out.error });
    return res.json(out.trip);
  })().catch((err) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });
});

router.patch("/:id/resume", (req, res) => {
  (async () => {
    const auth = (req as AuthedRequest).auth;
    if (!auth) return res.status(401).json({ error: "Unauthorized" });
    
    const { allowed, trip } = await canUpdateTripStatus(req.params.id, auth);
    if (!allowed) return res.status(403).json({ error: "Forbidden" });
    if (trip!.status !== "on_stop") return res.status(400).json({ error: "Trip must be on stop to resume" });
    
    const out = await store.trips.update(req.params.id, { status: "in_progress" } as any);
    if ("error" in out) return res.status(404).json({ error: out.error });
    return res.json(out.trip);
  })().catch((err) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });
});

router.patch("/:id/finish", (req, res) => {
  (async () => {
    const auth = (req as AuthedRequest).auth;
    if (!auth) return res.status(401).json({ error: "Unauthorized" });
    
    const { allowed, trip } = await canUpdateTripStatus(req.params.id, auth);
    if (!allowed) return res.status(403).json({ error: "Forbidden" });
    if (trip!.status === "completed") return res.status(400).json({ error: "Trip is already completed" });
    
    const out = await store.trips.update(req.params.id, { status: "completed" } as any);
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

