import bcrypt from "bcryptjs";
import { pool } from "../db/pool";
import { generateId, clients as memClients, companies as memCompanies, drivers as memDrivers, trips as memTrips, users as memUsers } from "./memory";
import type { Client, Company, Driver, Role, Trip, User } from "./types";

function nowIso() {
  return new Date().toISOString();
}

function toIso(v: any) {
  if (!v) return "";
  const d = v instanceof Date ? v : new Date(v);
  return d.toISOString();
}

function toNum(v: any) {
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v);
  return Number(v);
}

function safeUser(u: User) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt };
}

export type TripCreateInput = Omit<Trip, "id" | "createdAt" | "createdByUserId" | "received"> & { received?: boolean };
export type TripUpdateInput = Omit<Trip, "id" | "createdAt" | "createdByUserId" | "received"> & { received?: boolean };

export const store = {
  isDb: !!pool,

  users: {
    async findByEmail(email: string): Promise<User | null> {
      const e = email.toLowerCase();
      if (!pool) {
        return memUsers.find((u) => u.email.toLowerCase() === e) || null;
      }
      const res = await pool.query(
        `select id, name, email, password_hash, role, created_at from users where lower(email)=lower($1) limit 1`,
        [e]
      );
      const r = res.rows[0];
      if (!r) return null;
      return {
        id: r.id,
        name: r.name,
        email: r.email,
        passwordHash: r.password_hash,
        role: r.role as Role,
        createdAt: toIso(r.created_at),
      };
    },

    async listSafe() {
      if (!pool) return memUsers.map(safeUser);
      const res = await pool.query(`select id, name, email, role, created_at from users order by created_at desc`);
      return res.rows.map((r: any) => ({ id: r.id, name: r.name, email: r.email, role: r.role as Role, createdAt: toIso(r.created_at) }));
    },

    async create(input: { name: string; email: string; password: string; role: Role }) {
      const email = input.email.toLowerCase();
      if (!pool) {
        if (memUsers.some((u) => u.email.toLowerCase() === email)) return { error: "Email already exists" as const };
        const u: User = {
          id: generateId("u"),
          name: input.name,
          email,
          passwordHash: bcrypt.hashSync(input.password, 8),
          role: input.role,
          createdAt: nowIso(),
        };
        memUsers.push(u);
        return { user: safeUser(u) };
      }
      const existing = await pool.query(`select 1 from users where lower(email)=lower($1) limit 1`, [email]);
      if (existing.rowCount) return { error: "Email already exists" as const };
      const id = generateId("u");
      const passwordHash = bcrypt.hashSync(input.password, 8);
      const res = await pool.query(
        `insert into users (id, name, email, password_hash, role) values ($1,$2,$3,$4,$5) returning id, name, email, role, created_at`,
        [id, input.name, email, passwordHash, input.role]
      );
      const r = res.rows[0];
      return { user: { id: r.id, name: r.name, email: r.email, role: r.role as Role, createdAt: toIso(r.created_at) } };
    },

    async update(id: string, input: { name?: string; role?: Role }) {
      if (!pool) {
        const idx = memUsers.findIndex((u) => u.id === id);
        if (idx === -1) return { error: "User not found" as const };
        memUsers[idx] = { ...memUsers[idx], ...input };
        return { user: safeUser(memUsers[idx]) };
      }
      const res = await pool.query(
        `update users set name = coalesce($2, name), role = coalesce($3, role) where id=$1 returning id, name, email, role, created_at`,
        [id, input.name ?? null, input.role ?? null]
      );
      if (!res.rowCount) return { error: "User not found" as const };
      const r = res.rows[0];
      return { user: { id: r.id, name: r.name, email: r.email, role: r.role as Role, createdAt: toIso(r.created_at) } };
    },

    async resetPassword(id: string, newPassword: string) {
      const passwordHash = bcrypt.hashSync(newPassword, 8);
      if (!pool) {
        const idx = memUsers.findIndex((u) => u.id === id);
        if (idx === -1) return { error: "User not found" as const };
        memUsers[idx] = { ...memUsers[idx], passwordHash };
        return { ok: true as const };
      }
      const res = await pool.query(`update users set password_hash=$2 where id=$1`, [id, passwordHash]);
      if (!res.rowCount) return { error: "User not found" as const };
      return { ok: true as const };
    },

    async delete(id: string) {
      if (!pool) {
        const idx = memUsers.findIndex((u) => u.id === id);
        if (idx === -1) return { error: "User not found" as const };
        if (memTrips.some((t) => t.createdByUserId === id)) return { error: "Cannot delete user with trips" as const, conflict: true as const };
        const removed = memUsers.splice(idx, 1)[0];
        return { user: safeUser(removed) };
      }
      const hasTrips = await pool.query(`select 1 from trips where created_by_user_id=$1 limit 1`, [id]);
      if (hasTrips.rowCount) return { error: "Cannot delete user with trips" as const, conflict: true as const };
      const res = await pool.query(`delete from users where id=$1 returning id, name, email, role, created_at`, [id]);
      if (!res.rowCount) return { error: "User not found" as const };
      const r = res.rows[0];
      return { user: { id: r.id, name: r.name, email: r.email, role: r.role as Role, createdAt: toIso(r.created_at) } };
    },
  },

  drivers: {
    async list(): Promise<Driver[]> {
      if (!pool) return memDrivers;
      const res = await pool.query(`select id, name, phone, license, active, created_at from drivers order by created_at desc`);
      return res.rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        phone: r.phone ?? undefined,
        license: r.license ?? undefined,
        active: !!r.active,
        createdAt: toIso(r.created_at),
      }));
    },
    async exists(id: string) {
      if (!pool) return memDrivers.some((d) => d.id === id);
      const res = await pool.query(`select 1 from drivers where id=$1 limit 1`, [id]);
      return !!res.rowCount;
    },
    async create(input: Omit<Driver, "id" | "createdAt" | "active">) {
      if (!pool) {
        const d: Driver = { id: generateId("d"), createdAt: nowIso(), active: true, ...input };
        memDrivers.push(d);
        return d;
      }
      const id = generateId("d");
      const res = await pool.query(
        `insert into drivers (id, name, phone, license, active) values ($1,$2,$3,$4,true) returning id, name, phone, license, active, created_at`,
        [id, input.name, input.phone ?? null, input.license ?? null]
      );
      const r = res.rows[0];
      return { id: r.id, name: r.name, phone: r.phone ?? undefined, license: r.license ?? undefined, active: !!r.active, createdAt: toIso(r.created_at) };
    },
    async update(id: string, input: { name: string; phone?: string; license?: string }) {
      if (!pool) {
        const idx = memDrivers.findIndex((d) => d.id === id);
        if (idx === -1) return { error: "Driver not found" as const };
        memDrivers[idx] = { ...memDrivers[idx], ...input };
        return { driver: memDrivers[idx] };
      }
      const res = await pool.query(
        `update drivers set name=$2, phone=$3, license=$4 where id=$1 returning id, name, phone, license, active, created_at`,
        [id, input.name, input.phone ?? null, input.license ?? null]
      );
      if (!res.rowCount) return { error: "Driver not found" as const };
      const r = res.rows[0];
      return { driver: { id: r.id, name: r.name, phone: r.phone ?? undefined, license: r.license ?? undefined, active: !!r.active, createdAt: toIso(r.created_at) } };
    },
    async setActive(id: string, active: boolean) {
      if (!pool) {
        const idx = memDrivers.findIndex((d) => d.id === id);
        if (idx === -1) return { error: "Driver not found" as const };
        memDrivers[idx] = { ...memDrivers[idx], active };
        return { driver: memDrivers[idx] };
      }
      const res = await pool.query(`update drivers set active=$2 where id=$1 returning id, name, phone, license, active, created_at`, [id, active]);
      if (!res.rowCount) return { error: "Driver not found" as const };
      const r = res.rows[0];
      return { driver: { id: r.id, name: r.name, phone: r.phone ?? undefined, license: r.license ?? undefined, active: !!r.active, createdAt: toIso(r.created_at) } };
    },
    async delete(id: string) {
      if (!pool) {
        const idx = memDrivers.findIndex((d) => d.id === id);
        if (idx === -1) return { error: "Driver not found" as const };
        if (memTrips.some((t) => t.driverId === id)) return { error: "Cannot delete driver with trips" as const, conflict: true as const };
        const removed = memDrivers.splice(idx, 1)[0];
        return { driver: removed };
      }
      const hasTrips = await pool.query(`select 1 from trips where driver_id=$1 limit 1`, [id]);
      if (hasTrips.rowCount) return { error: "Cannot delete driver with trips" as const, conflict: true as const };
      const res = await pool.query(`delete from drivers where id=$1 returning id, name, phone, license, active, created_at`, [id]);
      if (!res.rowCount) return { error: "Driver not found" as const };
      const r = res.rows[0];
      return { driver: { id: r.id, name: r.name, phone: r.phone ?? undefined, license: r.license ?? undefined, active: !!r.active, createdAt: toIso(r.created_at) } };
    },
  },

  clients: {
    async list(): Promise<Client[]> {
      if (!pool) return memClients;
      const res = await pool.query(`select id, name, contact, phone, address, active, created_at from clients order by created_at desc`);
      return res.rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        phone: (r.phone ?? r.contact) ?? undefined,
        address: r.address ?? undefined,
        active: !!r.active,
        createdAt: toIso(r.created_at),
      }));
    },
    async exists(id: string) {
      if (!pool) return memClients.some((c) => c.id === id);
      const res = await pool.query(`select 1 from clients where id=$1 limit 1`, [id]);
      return !!res.rowCount;
    },
    async ensureByName(name: string): Promise<Client> {
      const normalized = name.trim();
      if (!normalized) throw new Error("Client name is required");
      if (!pool) {
        const existing = memClients.find((c) => c.name.trim().toLowerCase() === normalized.toLowerCase());
        if (existing) return existing;
        const c: Client = { id: generateId("c"), createdAt: nowIso(), active: true, name: normalized };
        memClients.push(c);
        return c;
      }
      const existing = await pool.query(
        `select id, name, contact, phone, address, active, created_at from clients where lower(name)=lower($1) limit 1`,
        [normalized]
      );
      if (existing.rowCount) {
        const r = existing.rows[0];
        return {
          id: r.id,
          name: r.name,
          phone: (r.phone ?? r.contact) ?? undefined,
          address: r.address ?? undefined,
          active: !!r.active,
          createdAt: toIso(r.created_at),
        };
      }
      const id = generateId("c");
      const res = await pool.query(
        `insert into clients (id, name, contact, phone, address, active)
         values ($1,$2,$3,$4,$5,true)
         returning id, name, contact, phone, address, active, created_at`,
        [id, normalized, null, null, null]
      );
      const r = res.rows[0];
      return {
        id: r.id,
        name: r.name,
        phone: (r.phone ?? r.contact) ?? undefined,
        address: r.address ?? undefined,
        active: !!r.active,
        createdAt: toIso(r.created_at),
      };
    },
    async create(input: Omit<Client, "id" | "createdAt" | "active">) {
      if (!pool) {
        const c: Client = { id: generateId("c"), createdAt: nowIso(), active: true, ...input };
        memClients.push(c);
        return c;
      }
      const id = generateId("c");
      const res = await pool.query(
        `insert into clients (id, name, contact, phone, address, active)
         values ($1,$2,$3,$4,$5,true)
         returning id, name, contact, phone, address, active, created_at`,
        // Keep "contact" in sync with phone for backward compatibility.
        [id, input.name, input.phone ?? null, input.phone ?? null, input.address ?? null]
      );
      const r = res.rows[0];
      return {
        id: r.id,
        name: r.name,
        phone: (r.phone ?? r.contact) ?? undefined,
        address: r.address ?? undefined,
        active: !!r.active,
        createdAt: toIso(r.created_at),
      };
    },
    async update(id: string, input: { name: string; phone?: string; address?: string }) {
      if (!pool) {
        const idx = memClients.findIndex((c) => c.id === id);
        if (idx === -1) return { error: "Client not found" as const };
        memClients[idx] = { ...memClients[idx], ...input };
        return { client: memClients[idx] };
      }
      const res = await pool.query(
        `update clients set name=$2, contact=$3, phone=$4, address=$5
         where id=$1
         returning id, name, contact, phone, address, active, created_at`,
        // Keep "contact" in sync with phone for backward compatibility.
        [id, input.name, input.phone ?? null, input.phone ?? null, input.address ?? null]
      );
      if (!res.rowCount) return { error: "Client not found" as const };
      const r = res.rows[0];
      return {
        client: {
          id: r.id,
          name: r.name,
          phone: (r.phone ?? r.contact) ?? undefined,
          address: r.address ?? undefined,
          active: !!r.active,
          createdAt: toIso(r.created_at),
        },
      };
    },
    async setActive(id: string, active: boolean) {
      if (!pool) {
        const idx = memClients.findIndex((c) => c.id === id);
        if (idx === -1) return { error: "Client not found" as const };
        memClients[idx] = { ...memClients[idx], active };
        return { client: memClients[idx] };
      }
      const res = await pool.query(
        `update clients set active=$2 where id=$1 returning id, name, contact, phone, address, active, created_at`,
        [id, active]
      );
      if (!res.rowCount) return { error: "Client not found" as const };
      const r = res.rows[0];
      return {
        client: {
          id: r.id,
          name: r.name,
          phone: (r.phone ?? r.contact) ?? undefined,
          address: r.address ?? undefined,
          active: !!r.active,
          createdAt: toIso(r.created_at),
        },
      };
    },
    async delete(id: string) {
      if (!pool) {
        const idx = memClients.findIndex((c) => c.id === id);
        if (idx === -1) return { error: "Client not found" as const };
        if (memTrips.some((t) => t.clientId === id)) return { error: "Cannot delete client with trips" as const, conflict: true as const };
        const removed = memClients.splice(idx, 1)[0];
        return { client: removed };
      }
      const hasTrips = await pool.query(`select 1 from trips where client_id=$1 limit 1`, [id]);
      if (hasTrips.rowCount) return { error: "Cannot delete client with trips" as const, conflict: true as const };
      const res = await pool.query(`delete from clients where id=$1 returning id, name, contact, phone, address, active, created_at`, [id]);
      if (!res.rowCount) return { error: "Client not found" as const };
      const r = res.rows[0];
      return {
        client: {
          id: r.id,
          name: r.name,
          phone: (r.phone ?? r.contact) ?? undefined,
          address: r.address ?? undefined,
          active: !!r.active,
          createdAt: toIso(r.created_at),
        },
      };
    },
  },

  companies: {
    async list(): Promise<Company[]> {
      if (!pool) return memCompanies;
      const res = await pool.query(`select id, name, phone, active, created_at from companies order by created_at desc`);
      return res.rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        phone: r.phone ?? undefined,
        active: !!r.active,
        createdAt: toIso(r.created_at),
      }));
    },
    async exists(id: string) {
      if (!pool) return memCompanies.some((c) => c.id === id);
      const res = await pool.query(`select 1 from companies where id=$1 limit 1`, [id]);
      return !!res.rowCount;
    },
    async create(input: Omit<Company, "id" | "createdAt" | "active">) {
      if (!pool) {
        const c: Company = { id: generateId("co"), createdAt: nowIso(), active: true, ...input };
        memCompanies.push(c);
        return c;
      }
      const id = generateId("co");
      const res = await pool.query(
        `insert into companies (id, name, phone, active) values ($1,$2,$3,true) returning id, name, phone, active, created_at`,
        [id, input.name, input.phone ?? null]
      );
      const r = res.rows[0];
      return { id: r.id, name: r.name, phone: r.phone ?? undefined, active: !!r.active, createdAt: toIso(r.created_at) };
    },
    async update(id: string, input: { name: string; phone?: string }) {
      if (!pool) {
        const idx = memCompanies.findIndex((c) => c.id === id);
        if (idx === -1) return { error: "Company not found" as const };
        memCompanies[idx] = { ...memCompanies[idx], ...input };
        return { company: memCompanies[idx] };
      }
      const res = await pool.query(
        `update companies set name=$2, phone=$3 where id=$1 returning id, name, phone, active, created_at`,
        [id, input.name, input.phone ?? null]
      );
      if (!res.rowCount) return { error: "Company not found" as const };
      const r = res.rows[0];
      return { company: { id: r.id, name: r.name, phone: r.phone ?? undefined, active: !!r.active, createdAt: toIso(r.created_at) } };
    },
    async setActive(id: string, active: boolean) {
      if (!pool) {
        const idx = memCompanies.findIndex((c) => c.id === id);
        if (idx === -1) return { error: "Company not found" as const };
        memCompanies[idx] = { ...memCompanies[idx], active };
        return { company: memCompanies[idx] };
      }
      const res = await pool.query(`update companies set active=$2 where id=$1 returning id, name, phone, active, created_at`, [id, active]);
      if (!res.rowCount) return { error: "Company not found" as const };
      const r = res.rows[0];
      return { company: { id: r.id, name: r.name, phone: r.phone ?? undefined, active: !!r.active, createdAt: toIso(r.created_at) } };
    },
    async delete(id: string) {
      if (!pool) {
        const idx = memCompanies.findIndex((c) => c.id === id);
        if (idx === -1) return { error: "Company not found" as const };
        if (memTrips.some((t) => t.companyId === id)) return { error: "Cannot delete company with trips" as const, conflict: true as const };
        const removed = memCompanies.splice(idx, 1)[0];
        return { company: removed };
      }
      const hasTrips = await pool.query(`select 1 from trips where company_id=$1 limit 1`, [id]);
      if (hasTrips.rowCount) return { error: "Cannot delete company with trips" as const, conflict: true as const };
      const res = await pool.query(`delete from companies where id=$1 returning id, name, phone, active, created_at`, [id]);
      if (!res.rowCount) return { error: "Company not found" as const };
      const r = res.rows[0];
      return { company: { id: r.id, name: r.name, phone: r.phone ?? undefined, active: !!r.active, createdAt: toIso(r.created_at) } };
    },
  },

  trips: {
    async list(filter: {
      driverId?: string;
      clientId?: string;
      companyId?: string;
      createdByUserId?: string;
      cnf?: string;
      flightNumber?: string;
      // boolean => presence filter; string => substring match
      meetGreet?: boolean | string;
    }): Promise<Trip[]> {
      if (!pool) {
        const { driverId, clientId, companyId, createdByUserId, cnf, flightNumber, meetGreet } = filter;
        return memTrips.filter(
          (t) =>
            (createdByUserId ? t.createdByUserId === createdByUserId : true) &&
            (driverId ? t.driverId === driverId : true) &&
            (clientId ? t.clientId === clientId : true) &&
            (companyId ? t.companyId === companyId : true) &&
            (cnf ? (t.cnf || "").toLowerCase().includes(cnf.toLowerCase()) : true) &&
            (flightNumber ? (t.flightNumber || "").toLowerCase().includes(flightNumber.toLowerCase()) : true) &&
            (typeof meetGreet === "boolean"
              ? !!(t.meetGreet && String(t.meetGreet).trim()) === meetGreet
              : typeof meetGreet === "string" && meetGreet.trim()
                ? (t.meetGreet || "").toLowerCase().includes(meetGreet.trim().toLowerCase())
                : true)
        );
      }
      const params: any[] = [];
      const where: string[] = [];
      if (filter.createdByUserId) {
        params.push(filter.createdByUserId);
        where.push(`created_by_user_id=$${params.length}`);
      }
      if (filter.driverId) {
        params.push(filter.driverId);
        where.push(`driver_id=$${params.length}`);
      }
      if (filter.clientId) {
        params.push(filter.clientId);
        where.push(`client_id=$${params.length}`);
      }
      if (filter.companyId) {
        params.push(filter.companyId);
        where.push(`company_id=$${params.length}`);
      }
      if (filter.cnf) {
        params.push(`%${filter.cnf}%`);
        where.push(`cnf ilike $${params.length}`);
      }
      if (filter.flightNumber) {
        params.push(`%${filter.flightNumber}%`);
        where.push(`flight_number ilike $${params.length}`);
      }
      if (typeof filter.meetGreet === "boolean") {
        params.push(filter.meetGreet);
        // presence filter: true => non-empty, false => empty/null
        where.push(`(nullif(meet_greet,'') is not null) = $${params.length}`);
      } else if (typeof filter.meetGreet === "string" && filter.meetGreet.trim()) {
        params.push(`%${filter.meetGreet.trim()}%`);
        where.push(`meet_greet ilike $${params.length}`);
      }
      const sql =
        `select id, created_by_user_id, driver_id, client_id, company_id, vehicle_type, cnf, flight_number, meet_greet, client_phone, start_at, end_at, origin, destination, miles, duration_minutes, price, received, notes, created_at from trips` +
        (where.length ? ` where ${where.join(" and ")}` : "") +
        ` order by start_at desc`;
      const res = await pool.query(sql, params);
      return res.rows.map((r: any) => ({
        id: r.id,
        createdByUserId: r.created_by_user_id,
        driverId: r.driver_id,
        clientId: r.client_id ?? null,
        companyId: r.company_id,
        vehicleType: r.vehicle_type ?? null,
        cnf: r.cnf ?? undefined,
        flightNumber: r.flight_number ?? undefined,
        meetGreet: typeof r.meet_greet === "string" && r.meet_greet.trim() ? r.meet_greet : undefined,
        clientPhone: typeof r.client_phone === "string" && r.client_phone.trim() ? r.client_phone : undefined,
        startAt: toIso(r.start_at),
        endAt: toIso(r.end_at),
        origin: r.origin,
        destination: r.destination,
        miles: toNum(r.miles),
        durationMinutes: toNum(r.duration_minutes),
        price: toNum(r.price),
        received: !!r.received,
        notes: r.notes ?? undefined,
        createdAt: toIso(r.created_at),
      }));
    },

    async get(id: string): Promise<Trip | null> {
      if (!pool) {
        return memTrips.find((t) => t.id === id) || null;
      }
      const res = await pool.query(
        `select id, created_by_user_id, driver_id, client_id, company_id, vehicle_type, cnf, flight_number, meet_greet, client_phone, start_at, end_at, origin, destination, miles, duration_minutes, price, received, notes, created_at
         from trips where id=$1 limit 1`,
        [id]
      );
      if (!res.rowCount) return null;
      const r = res.rows[0];
      return {
        id: r.id,
        createdByUserId: r.created_by_user_id,
        driverId: r.driver_id,
        clientId: r.client_id ?? null,
        companyId: r.company_id,
        vehicleType: r.vehicle_type ?? null,
        cnf: r.cnf ?? undefined,
        flightNumber: r.flight_number ?? undefined,
        meetGreet: typeof r.meet_greet === "string" && r.meet_greet.trim() ? r.meet_greet : undefined,
        clientPhone: typeof r.client_phone === "string" && r.client_phone.trim() ? r.client_phone : undefined,
        startAt: toIso(r.start_at),
        endAt: toIso(r.end_at),
        origin: r.origin,
        destination: r.destination,
        miles: toNum(r.miles),
        durationMinutes: toNum(r.duration_minutes),
        price: toNum(r.price),
        received: !!r.received,
        notes: r.notes ?? undefined,
        createdAt: toIso(r.created_at),
      };
    },

    async create(input: TripCreateInput, createdByUserId: string) {
      if (!pool) {
        const { received, ...rest } = input as any;
        const t: Trip = {
          id: generateId("t"),
          createdAt: nowIso(),
          received: received ?? false,
          createdByUserId,
          ...rest,
        } as Trip;
        memTrips.push(t);
        return t;
      }
      const id = generateId("t");
      const res = await pool.query(
        `insert into trips (id, created_by_user_id, driver_id, client_id, company_id, vehicle_type, cnf, flight_number, meet_greet, client_phone, start_at, end_at, origin, destination, miles, duration_minutes, price, received, notes)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
         returning id, created_by_user_id, driver_id, client_id, company_id, vehicle_type, cnf, flight_number, meet_greet, client_phone, start_at, end_at, origin, destination, miles, duration_minutes, price, received, notes, created_at`,
        [
          id,
          createdByUserId,
          input.driverId,
          input.clientId ?? null,
          input.companyId,
          input.vehicleType ?? null,
          input.cnf ?? null,
          input.flightNumber ?? null,
          input.meetGreet ?? "",
          input.clientPhone ?? null,
          input.startAt,
          input.endAt,
          input.origin,
          input.destination,
          input.miles,
          input.durationMinutes,
          input.price,
          input.received ?? false,
          input.notes ?? null,
        ]
      );
      const r = res.rows[0];
      return {
        id: r.id,
        createdByUserId: r.created_by_user_id,
        driverId: r.driver_id,
        clientId: r.client_id ?? null,
        companyId: r.company_id,
        vehicleType: r.vehicle_type ?? null,
        cnf: r.cnf ?? undefined,
        flightNumber: r.flight_number ?? undefined,
        meetGreet: typeof r.meet_greet === "string" && r.meet_greet.trim() ? r.meet_greet : undefined,
        clientPhone: typeof r.client_phone === "string" && r.client_phone.trim() ? r.client_phone : undefined,
        startAt: toIso(r.start_at),
        endAt: toIso(r.end_at),
        origin: r.origin,
        destination: r.destination,
        miles: toNum(r.miles),
        durationMinutes: toNum(r.duration_minutes),
        price: toNum(r.price),
        received: !!r.received,
        notes: r.notes ?? undefined,
        createdAt: toIso(r.created_at),
      };
    },

    async update(id: string, input: TripUpdateInput) {
      if (!pool) {
        const idx = memTrips.findIndex((t) => t.id === id);
        if (idx === -1) return { error: "Trip not found" as const };
        memTrips[idx] = { ...memTrips[idx], ...input, received: input.received ?? memTrips[idx].received ?? false };
        return { trip: memTrips[idx] };
      }
      const res = await pool.query(
        `update trips set
          driver_id=$2, client_id=$3, company_id=$4, vehicle_type=$5, cnf=$6, flight_number=$7, client_phone=coalesce($8, client_phone), meet_greet=coalesce($9, meet_greet), start_at=$10, end_at=$11, origin=$12, destination=$13,
          miles=$14, duration_minutes=$15, price=$16, received=coalesce($17, received), notes=$18
        where id=$1
        returning id, created_by_user_id, driver_id, client_id, company_id, vehicle_type, cnf, flight_number, meet_greet, client_phone, start_at, end_at, origin, destination, miles, duration_minutes, price, received, notes, created_at`,
        [
          id,
          input.driverId,
          input.clientId ?? null,
          input.companyId,
          input.vehicleType ?? null,
          input.cnf ?? null,
          input.flightNumber ?? null,
          input.clientPhone ?? null,
          input.meetGreet ?? null,
          input.startAt,
          input.endAt,
          input.origin,
          input.destination,
          input.miles,
          input.durationMinutes,
          input.price,
          input.received ?? null,
          input.notes ?? null,
        ]
      );
      if (!res.rowCount) return { error: "Trip not found" as const };
      const r = res.rows[0];
      return {
        trip: {
          id: r.id,
          createdByUserId: r.created_by_user_id,
          driverId: r.driver_id,
          clientId: r.client_id ?? null,
          companyId: r.company_id,
          vehicleType: r.vehicle_type ?? null,
          cnf: r.cnf ?? undefined,
          flightNumber: r.flight_number ?? undefined,
          meetGreet: typeof r.meet_greet === "string" && r.meet_greet.trim() ? r.meet_greet : undefined,
          clientPhone: typeof r.client_phone === "string" && r.client_phone.trim() ? r.client_phone : undefined,
          startAt: toIso(r.start_at),
          endAt: toIso(r.end_at),
          origin: r.origin,
          destination: r.destination,
          miles: toNum(r.miles),
          durationMinutes: toNum(r.duration_minutes),
          price: toNum(r.price),
          received: !!r.received,
          notes: r.notes ?? undefined,
          createdAt: toIso(r.created_at),
        },
      };
    },

    async setReceived(id: string, received: boolean) {
      if (!pool) {
        const idx = memTrips.findIndex((t) => t.id === id);
        if (idx === -1) return { error: "Trip not found" as const };
        memTrips[idx] = { ...memTrips[idx], received };
        return { trip: memTrips[idx] };
      }
      const res = await pool.query(
        `update trips set received=$2 where id=$1 returning id, created_by_user_id, driver_id, client_id, company_id, vehicle_type, cnf, flight_number, meet_greet, client_phone, start_at, end_at, origin, destination, miles, duration_minutes, price, received, notes, created_at`,
        [id, received]
      );
      if (!res.rowCount) return { error: "Trip not found" as const };
      const r = res.rows[0];
      return {
        trip: {
          id: r.id,
          createdByUserId: r.created_by_user_id,
          driverId: r.driver_id,
          clientId: r.client_id ?? null,
          companyId: r.company_id,
          vehicleType: r.vehicle_type ?? null,
          cnf: r.cnf ?? undefined,
          flightNumber: r.flight_number ?? undefined,
          meetGreet: typeof r.meet_greet === "string" && r.meet_greet.trim() ? r.meet_greet : undefined,
          clientPhone: typeof r.client_phone === "string" && r.client_phone.trim() ? r.client_phone : undefined,
          startAt: toIso(r.start_at),
          endAt: toIso(r.end_at),
          origin: r.origin,
          destination: r.destination,
          miles: toNum(r.miles),
          durationMinutes: toNum(r.duration_minutes),
          price: toNum(r.price),
          received: !!r.received,
          notes: r.notes ?? undefined,
          createdAt: toIso(r.created_at),
        },
      };
    },

    async delete(id: string) {
      if (!pool) {
        const idx = memTrips.findIndex((t) => t.id === id);
        if (idx === -1) return { error: "Trip not found" as const };
        if (memTrips[idx].received) return { error: "Cannot delete a received trip" as const, conflict: true as const };
        const removed = memTrips.splice(idx, 1)[0];
        return { trip: removed };
      }
      const res = await pool.query(`select received from trips where id=$1`, [id]);
      if (!res.rowCount) return { error: "Trip not found" as const };
      if (res.rows[0].received) return { error: "Cannot delete a received trip" as const, conflict: true as const };
      const del = await pool.query(
        `delete from trips where id=$1 returning id, created_by_user_id, driver_id, client_id, company_id, vehicle_type, cnf, flight_number, meet_greet, client_phone, start_at, end_at, origin, destination, miles, duration_minutes, price, received, notes, created_at`,
        [id]
      );
      const r = del.rows[0];
      return {
        trip: {
          id: r.id,
          createdByUserId: r.created_by_user_id,
          driverId: r.driver_id,
          clientId: r.client_id ?? null,
          companyId: r.company_id,
          vehicleType: r.vehicle_type ?? null,
          cnf: r.cnf ?? undefined,
          flightNumber: r.flight_number ?? undefined,
          meetGreet: typeof r.meet_greet === "string" && r.meet_greet.trim() ? r.meet_greet : undefined,
          clientPhone: typeof r.client_phone === "string" && r.client_phone.trim() ? r.client_phone : undefined,
          startAt: toIso(r.start_at),
          endAt: toIso(r.end_at),
          origin: r.origin,
          destination: r.destination,
          miles: toNum(r.miles),
          durationMinutes: toNum(r.duration_minutes),
          price: toNum(r.price),
          received: !!r.received,
          notes: r.notes ?? undefined,
          createdAt: toIso(r.created_at),
        },
      };
    },
  },

  dashboard: {
    async summary(filter?: { createdByUserId?: string }) {
      if (!pool) {
        const trips = filter?.createdByUserId ? memTrips.filter((t) => t.createdByUserId === filter.createdByUserId) : memTrips;
        const totalTrips = trips.length;
        const totalRevenue = trips.reduce((acc, t) => acc + t.price, 0);
        const totalMiles = trips.reduce((acc, t) => acc + t.miles, 0);
        const avgDuration = trips.length ? trips.reduce((acc, t) => acc + t.durationMinutes, 0) / trips.length : 0;
        return {
          totalTrips,
          totalRevenue,
          totalMiles,
          avgDurationMinutes: Number(avgDuration.toFixed(2)),
        };
      }
      const params: any[] = [];
      const where: string[] = [];
      if (filter?.createdByUserId) {
        params.push(filter.createdByUserId);
        where.push(`created_by_user_id=$${params.length}`);
      }
      const sql =
        `select count(*)::int as total_trips,
                coalesce(sum(price),0)::float as total_revenue,
                coalesce(sum(miles),0)::float as total_miles,
                coalesce(avg(duration_minutes),0)::float as avg_duration
         from trips` + (where.length ? ` where ${where.join(" and ")}` : "");
      const res = await pool.query(sql, params);
      const r = res.rows[0];
      return {
        totalTrips: Number(r.total_trips || 0),
        totalRevenue: toNum(r.total_revenue || 0),
        totalMiles: toNum(r.total_miles || 0),
        avgDurationMinutes: Number(toNum(r.avg_duration || 0).toFixed(2)),
      };
    },
  },
};


