import bcrypt from "bcryptjs";
import { pool } from "../db/pool";
import {
  generateId,
  clients as memClients,
  companies as memCompanies,
  drivers as memDrivers,
  trips as memTrips,
  users as memUsers,
  vehicles as memVehicles,
  settings as memSettings,
} from "./memory";
import type { AppSettings, Client, Company, Driver, Role, Trip, TripStatus, User, Vehicle } from "./types";

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

const defaultModules = ["dashboard", "trips", "drivers", "clients", "companies", "users", "driver-trips", "home"];

function toSettings(row: any): AppSettings {
  return {
    id: row.id,
    ownerCompanyId: row.owner_company_id ?? null,
    logoDataUrl: row.logo_data_url ?? null,
    enabledModules: Array.isArray(row.enabled_modules) ? row.enabled_modules : [],
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function safeUser(u: User) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, driverId: u.driverId, createdAt: u.createdAt };
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
        `select id, name, email, password_hash, role, driver_id, created_at from users where lower(email)=lower($1) limit 1`,
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
        driverId: r.driver_id ?? undefined,
        createdAt: toIso(r.created_at),
      };
    },

    async findById(id: string): Promise<User | null> {
      if (!pool) {
        return memUsers.find((u) => u.id === id) || null;
      }
      const res = await pool.query(
        `select id, name, email, password_hash, role, driver_id, created_at from users where id=$1 limit 1`,
        [id]
      );
      const r = res.rows[0];
      if (!r) return null;
      return {
        id: r.id,
        name: r.name,
        email: r.email,
        passwordHash: r.password_hash,
        role: r.role as Role,
        driverId: r.driver_id ?? undefined,
        createdAt: toIso(r.created_at),
      };
    },

    async listSafe() {
      if (!pool) return memUsers.map(safeUser);
      const res = await pool.query(`select id, name, email, role, driver_id, created_at from users order by created_at desc`);
      return res.rows.map((r: any) => ({ id: r.id, name: r.name, email: r.email, role: r.role as Role, driverId: r.driver_id ?? undefined, createdAt: toIso(r.created_at) }));
    },

    async create(input: { name: string; email: string; password: string; role: Role; driverId?: string }) {
      const email = input.email.toLowerCase();
      if (!pool) {
        if (memUsers.some((u) => u.email.toLowerCase() === email)) return { error: "Email already exists" as const };
        const u: User = {
          id: generateId("u"),
          name: input.name,
          email,
          passwordHash: bcrypt.hashSync(input.password, 8),
          role: input.role,
          driverId: input.driverId,
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
        `insert into users (id, name, email, password_hash, role, driver_id) values ($1,$2,$3,$4,$5,$6) returning id, name, email, role, driver_id, created_at`,
        [id, input.name, email, passwordHash, input.role, input.driverId ?? null]
      );
      const r = res.rows[0];
      return { user: { id: r.id, name: r.name, email: r.email, role: r.role as Role, driverId: r.driver_id ?? undefined, createdAt: toIso(r.created_at) } };
    },

    async update(id: string, input: { name?: string; role?: Role; driverId?: string | null }) {
      if (!pool) {
        const idx = memUsers.findIndex((u) => u.id === id);
        if (idx === -1) return { error: "User not found" as const };
        memUsers[idx] = { ...memUsers[idx], ...input };
        return { user: safeUser(memUsers[idx]) };
      }
      // Build update query dynamically based on what fields are provided
      const updates: string[] = [];
      const params: any[] = [id];
      let paramIndex = 2;
      
      if (input.name !== undefined) {
        updates.push(`name = $${paramIndex}`);
        params.push(input.name);
        paramIndex++;
      }
      
      if (input.role !== undefined) {
        updates.push(`role = $${paramIndex}`);
        params.push(input.role);
        paramIndex++;
      }
      
      if (input.driverId !== undefined) {
        updates.push(`driver_id = $${paramIndex}`);
        params.push(input.driverId || null);
        paramIndex++;
      }
      
      if (updates.length === 0) {
        // No updates, just return the current user
        const res = await pool.query(`select id, name, email, role, driver_id, created_at from users where id=$1`, [id]);
        if (!res.rowCount) return { error: "User not found" as const };
        const r = res.rows[0];
        return { user: { id: r.id, name: r.name, email: r.email, role: r.role as Role, driverId: r.driver_id ?? undefined, createdAt: toIso(r.created_at) } };
      }
      
      const res = await pool.query(
        `update users set ${updates.join(", ")} where id=$1 returning id, name, email, role, driver_id, created_at`,
        params
      );
      if (!res.rowCount) return { error: "User not found" as const };
      const r = res.rows[0];
      return { user: { id: r.id, name: r.name, email: r.email, role: r.role as Role, driverId: r.driver_id ?? undefined, createdAt: toIso(r.created_at) } };
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
      const res = await pool.query(`delete from users where id=$1 returning id, name, email, role, driver_id, created_at`, [id]);
      if (!res.rowCount) return { error: "User not found" as const };
      const r = res.rows[0];
      return { user: { id: r.id, name: r.name, email: r.email, role: r.role as Role, driverId: r.driver_id ?? undefined, createdAt: toIso(r.created_at) } };
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
      const res = await pool.query(`select id, name, contact, phone, address, company_id, active, created_at from clients order by created_at desc`);
      return res.rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        phone: (r.phone ?? r.contact) ?? undefined,
        address: r.address ?? undefined,
        companyId: r.company_id ?? undefined,
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
        `select id, name, contact, phone, address, company_id, active, created_at from clients where lower(name)=lower($1) limit 1`,
        [normalized]
      );
      if (existing.rowCount) {
        const r = existing.rows[0];
        return {
          id: r.id,
          name: r.name,
          phone: (r.phone ?? r.contact) ?? undefined,
          address: r.address ?? undefined,
          companyId: r.company_id ?? undefined,
          active: !!r.active,
          createdAt: toIso(r.created_at),
        };
      }
      const id = generateId("c");
      const res = await pool.query(
        `insert into clients (id, name, contact, phone, address, company_id, active)
         values ($1,$2,$3,$4,$5,$6,true)
         returning id, name, contact, phone, address, company_id, active, created_at`,
        [id, normalized, null, null, null, null]
      );
      const r = res.rows[0];
      return {
        id: r.id,
        name: r.name,
        phone: (r.phone ?? r.contact) ?? undefined,
        address: r.address ?? undefined,
        companyId: r.company_id ?? undefined,
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
        `insert into clients (id, name, contact, phone, address, company_id, active)
         values ($1,$2,$3,$4,$5,$6,true)
         returning id, name, contact, phone, address, company_id, active, created_at`,
        // Keep "contact" in sync with phone for backward compatibility.
        [id, input.name, input.phone ?? null, input.phone ?? null, input.address ?? null, input.companyId ?? null]
      );
      const r = res.rows[0];
      return {
        id: r.id,
        name: r.name,
        phone: (r.phone ?? r.contact) ?? undefined,
        address: r.address ?? undefined,
        companyId: r.company_id ?? undefined,
        active: !!r.active,
        createdAt: toIso(r.created_at),
      };
    },
    async update(id: string, input: { name: string; phone?: string; address?: string; companyId?: string }) {
      if (!pool) {
        const idx = memClients.findIndex((c) => c.id === id);
        if (idx === -1) return { error: "Client not found" as const };
        memClients[idx] = { ...memClients[idx], ...input };
        return { client: memClients[idx] };
      }
      const res = await pool.query(
        `update clients set name=$2, contact=$3, phone=$4, address=$5, company_id=$6
         where id=$1
         returning id, name, contact, phone, address, company_id, active, created_at`,
        // Keep "contact" in sync with phone for backward compatibility.
        [id, input.name, input.phone ?? null, input.phone ?? null, input.address ?? null, input.companyId ?? null]
      );
      if (!res.rowCount) return { error: "Client not found" as const };
      const r = res.rows[0];
      return {
        client: {
          id: r.id,
          name: r.name,
          phone: (r.phone ?? r.contact) ?? undefined,
          address: r.address ?? undefined,
          companyId: r.company_id ?? undefined,
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
        `update clients set active=$2 where id=$1 returning id, name, contact, phone, address, company_id, active, created_at`,
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
          companyId: r.company_id ?? undefined,
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
      const res = await pool.query(`delete from clients where id=$1 returning id, name, contact, phone, address, company_id, active, created_at`, [id]);
      if (!res.rowCount) return { error: "Client not found" as const };
      const r = res.rows[0];
      return {
        client: {
          id: r.id,
          name: r.name,
          phone: (r.phone ?? r.contact) ?? undefined,
          address: r.address ?? undefined,
          companyId: r.company_id ?? undefined,
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

  vehicles: {
    async list(): Promise<Vehicle[]> {
      if (!pool) return memVehicles;
      const res = await pool.query(
        `select id, name, brand, model, year, plate, company_id, active, created_at from vehicles order by created_at desc`
      );
      return res.rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        brand: r.brand ?? undefined,
        model: r.model ?? undefined,
        year: r.year ?? undefined,
        plate: r.plate ?? undefined,
        companyId: r.company_id,
        active: !!r.active,
        createdAt: toIso(r.created_at),
      }));
    },
    async exists(id: string) {
      if (!pool) return memVehicles.some((v) => v.id === id);
      const res = await pool.query(`select 1 from vehicles where id=$1 limit 1`, [id]);
      return !!res.rowCount;
    },
    async get(id: string): Promise<Vehicle | null> {
      if (!pool) return memVehicles.find((v) => v.id === id) || null;
      const res = await pool.query(
        `select id, name, brand, model, year, plate, company_id, active, created_at from vehicles where id=$1 limit 1`,
        [id]
      );
      if (!res.rowCount) return null;
      const r = res.rows[0];
      return {
        id: r.id,
        name: r.name,
        brand: r.brand ?? undefined,
        model: r.model ?? undefined,
        year: r.year ?? undefined,
        plate: r.plate ?? undefined,
        companyId: r.company_id,
        active: !!r.active,
        createdAt: toIso(r.created_at),
      };
    },
    async create(input: Omit<Vehicle, "id" | "createdAt" | "active">) {
      if (!pool) {
        const v: Vehicle = { id: generateId("v"), createdAt: nowIso(), active: true, ...input };
        memVehicles.push(v);
        return v;
      }
      const id = generateId("v");
      const res = await pool.query(
        `insert into vehicles (id, name, brand, model, year, plate, company_id, active)
         values ($1,$2,$3,$4,$5,$6,$7,true)
         returning id, name, brand, model, year, plate, company_id, active, created_at`,
        [id, input.name, input.brand ?? null, input.model ?? null, input.year ?? null, input.plate ?? null, input.companyId]
      );
      const r = res.rows[0];
      return {
        id: r.id,
        name: r.name,
        brand: r.brand ?? undefined,
        model: r.model ?? undefined,
        year: r.year ?? undefined,
        plate: r.plate ?? undefined,
        companyId: r.company_id,
        active: !!r.active,
        createdAt: toIso(r.created_at),
      };
    },
    async update(id: string, input: { name: string; brand?: string; model?: string; year?: number; plate?: string; companyId: string }) {
      if (!pool) {
        const idx = memVehicles.findIndex((v) => v.id === id);
        if (idx === -1) return { error: "Vehicle not found" as const };
        memVehicles[idx] = { ...memVehicles[idx], ...input };
        return { vehicle: memVehicles[idx] };
      }
      const res = await pool.query(
        `update vehicles set name=$2, brand=$3, model=$4, year=$5, plate=$6, company_id=$7
         where id=$1
         returning id, name, brand, model, year, plate, company_id, active, created_at`,
        [id, input.name, input.brand ?? null, input.model ?? null, input.year ?? null, input.plate ?? null, input.companyId]
      );
      if (!res.rowCount) return { error: "Vehicle not found" as const };
      const r = res.rows[0];
      return {
        vehicle: {
          id: r.id,
          name: r.name,
          brand: r.brand ?? undefined,
          model: r.model ?? undefined,
          year: r.year ?? undefined,
          plate: r.plate ?? undefined,
          companyId: r.company_id,
          active: !!r.active,
          createdAt: toIso(r.created_at),
        },
      };
    },
    async setActive(id: string, active: boolean) {
      if (!pool) {
        const idx = memVehicles.findIndex((v) => v.id === id);
        if (idx === -1) return { error: "Vehicle not found" as const };
        memVehicles[idx] = { ...memVehicles[idx], active };
        return { vehicle: memVehicles[idx] };
      }
      const res = await pool.query(
        `update vehicles set active=$2 where id=$1 returning id, name, brand, model, year, plate, company_id, active, created_at`,
        [id, active]
      );
      if (!res.rowCount) return { error: "Vehicle not found" as const };
      const r = res.rows[0];
      return {
        vehicle: {
          id: r.id,
          name: r.name,
          brand: r.brand ?? undefined,
          model: r.model ?? undefined,
          year: r.year ?? undefined,
          plate: r.plate ?? undefined,
          companyId: r.company_id,
          active: !!r.active,
          createdAt: toIso(r.created_at),
        },
      };
    },
    async delete(id: string) {
      if (!pool) {
        const idx = memVehicles.findIndex((v) => v.id === id);
        if (idx === -1) return { error: "Vehicle not found" as const };
        if (memTrips.some((t) => t.vehicleId === id)) return { error: "Cannot delete vehicle with trips" as const, conflict: true as const };
        const removed = memVehicles.splice(idx, 1)[0];
        return { vehicle: removed };
      }
      const hasTrips = await pool.query(`select 1 from trips where vehicle_id=$1 limit 1`, [id]);
      if (hasTrips.rowCount) return { error: "Cannot delete vehicle with trips" as const, conflict: true as const };
      const res = await pool.query(
        `delete from vehicles where id=$1 returning id, name, brand, model, year, plate, company_id, active, created_at`,
        [id]
      );
      if (!res.rowCount) return { error: "Vehicle not found" as const };
      const r = res.rows[0];
      return {
        vehicle: {
          id: r.id,
          name: r.name,
          brand: r.brand ?? undefined,
          model: r.model ?? undefined,
          year: r.year ?? undefined,
          plate: r.plate ?? undefined,
          companyId: r.company_id,
          active: !!r.active,
          createdAt: toIso(r.created_at),
        },
      };
    },
  },

  trips: {
    async list(filter: {
      driverId?: string;
      clientId?: string;
      companyId?: string;
      vehicleId?: string;
      createdByUserId?: string;
      cnf?: string;
      flightNumber?: string;
      // boolean => presence filter; string => substring match
      meetGreet?: boolean | string;
    }): Promise<Trip[]> {
      if (!pool) {
        const { driverId, clientId, companyId, vehicleId, createdByUserId, cnf, flightNumber, meetGreet } = filter;
        return memTrips.filter(
          (t) =>
            (createdByUserId ? t.createdByUserId === createdByUserId : true) &&
            (driverId ? t.driverId === driverId : true) &&
            (clientId ? t.clientId === clientId : true) &&
            (companyId ? t.companyId === companyId : true) &&
            (vehicleId ? t.vehicleId === vehicleId : true) &&
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
        console.log(`[Store] Filtering trips by driverId: ${filter.driverId}`);
      }
      if (filter.clientId) {
        params.push(filter.clientId);
        where.push(`client_id=$${params.length}`);
      }
      if (filter.companyId) {
        params.push(filter.companyId);
        where.push(`company_id=$${params.length}`);
      }
      if (filter.vehicleId) {
        params.push(filter.vehicleId);
        where.push(`vehicle_id=$${params.length}`);
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
        `select id, created_by_user_id, driver_id, client_id, company_id, vehicle_id, trip_type, hourly_start_time, hourly_end_time, vehicle_type, cnf, flight_number, meet_greet, client_phone, start_at, end_at, origin, destination, stop, miles, duration_minutes, price, received, status, started_at, finished_at, notes, created_at from trips` +
        (where.length ? ` where ${where.join(" and ")}` : "") +
        ` order by start_at desc`;
      console.log(`[Store] Executing query: ${sql}`, params);
      const res = await pool.query(sql, params);
      console.log(`[Store] Query returned ${res.rowCount} rows`);
      return res.rows.map((r: any) => ({
        id: r.id,
        createdByUserId: r.created_by_user_id,
        driverId: r.driver_id,
        clientId: r.client_id ?? null,
        companyId: r.company_id,
        vehicleId: r.vehicle_id ?? null,
        tripType: r.trip_type ?? "transfer",
        hourlyStartTime: r.hourly_start_time ?? undefined,
        hourlyEndTime: r.hourly_end_time ?? undefined,
        vehicleType: r.vehicle_type ?? null,
        cnf: r.cnf ?? undefined,
        flightNumber: r.flight_number ?? undefined,
        meetGreet: typeof r.meet_greet === "string" && r.meet_greet.trim() ? r.meet_greet : undefined,
        clientPhone: typeof r.client_phone === "string" && r.client_phone.trim() ? r.client_phone : undefined,
        startAt: toIso(r.start_at),
        endAt: toIso(r.end_at),
        origin: r.origin,
        destination: r.destination,
        stop: r.stop ?? undefined,
        miles: toNum(r.miles),
        durationMinutes: toNum(r.duration_minutes),
        price: toNum(r.price),
        received: !!r.received,
        status: (r.status || "pending") as TripStatus,
        startedAt: r.started_at ? toIso(r.started_at) : undefined,
        finishedAt: r.finished_at ? toIso(r.finished_at) : undefined,
        notes: r.notes ?? undefined,
        createdAt: toIso(r.created_at),
      }));
    },

    async get(id: string): Promise<Trip | null> {
      if (!pool) {
        return memTrips.find((t) => t.id === id) || null;
      }
      const res = await pool.query(
        `select id, created_by_user_id, driver_id, client_id, company_id, vehicle_id, trip_type, hourly_start_time, hourly_end_time, vehicle_type, cnf, flight_number, meet_greet, client_phone, start_at, end_at, origin, destination, stop, miles, duration_minutes, price, received, status, started_at, finished_at, notes, created_at
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
        vehicleId: r.vehicle_id ?? null,
        tripType: r.trip_type ?? "transfer",
        hourlyStartTime: r.hourly_start_time ?? undefined,
        hourlyEndTime: r.hourly_end_time ?? undefined,
        vehicleType: r.vehicle_type ?? null,
        cnf: r.cnf ?? undefined,
        flightNumber: r.flight_number ?? undefined,
        meetGreet: typeof r.meet_greet === "string" && r.meet_greet.trim() ? r.meet_greet : undefined,
        clientPhone: typeof r.client_phone === "string" && r.client_phone.trim() ? r.client_phone : undefined,
        startAt: toIso(r.start_at),
        endAt: toIso(r.end_at),
        origin: r.origin,
        destination: r.destination,
        stop: r.stop ?? undefined,
        miles: toNum(r.miles),
        durationMinutes: toNum(r.duration_minutes),
        price: toNum(r.price),
        received: !!r.received,
        status: (r.status || "pending") as TripStatus,
        startedAt: r.started_at ? toIso(r.started_at) : undefined,
        finishedAt: r.finished_at ? toIso(r.finished_at) : undefined,
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
          status: (input.status || "pending") as TripStatus,
          createdByUserId,
          ...rest,
        } as Trip;
        memTrips.push(t);
        return t;
      }
      const id = generateId("t");
      const res = await pool.query(
        `insert into trips (id, created_by_user_id, driver_id, client_id, company_id, vehicle_id, trip_type, hourly_start_time, hourly_end_time, vehicle_type, cnf, flight_number, meet_greet, client_phone, start_at, end_at, origin, destination, stop, miles, duration_minutes, price, received, status, notes)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
         returning id, created_by_user_id, driver_id, client_id, company_id, vehicle_id, trip_type, hourly_start_time, hourly_end_time, vehicle_type, cnf, flight_number, meet_greet, client_phone, start_at, end_at, origin, destination, stop, miles, duration_minutes, price, received, status, started_at, finished_at, notes, created_at`,
        [
          id,
          createdByUserId,
          input.driverId,
          input.clientId ?? null,
          input.companyId,
          input.vehicleId ?? null,
          input.tripType ?? "transfer",
          input.hourlyStartTime ?? null,
          input.hourlyEndTime ?? null,
          input.vehicleType ?? null,
          input.cnf ?? null,
          input.flightNumber ?? null,
          input.meetGreet ?? "",
          input.clientPhone ?? null,
          input.startAt,
          input.endAt,
          input.origin,
          input.destination,
          input.stop ?? null,
          input.miles,
          input.durationMinutes,
          input.price,
          input.received ?? false,
          input.status ?? "pending",
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
        vehicleId: r.vehicle_id ?? null,
        tripType: r.trip_type ?? "transfer",
        hourlyStartTime: r.hourly_start_time ?? undefined,
        hourlyEndTime: r.hourly_end_time ?? undefined,
        vehicleType: r.vehicle_type ?? null,
        cnf: r.cnf ?? undefined,
        flightNumber: r.flight_number ?? undefined,
        meetGreet: typeof r.meet_greet === "string" && r.meet_greet.trim() ? r.meet_greet : undefined,
        clientPhone: typeof r.client_phone === "string" && r.client_phone.trim() ? r.client_phone : undefined,
        startAt: toIso(r.start_at),
        endAt: toIso(r.end_at),
        origin: r.origin,
        destination: r.destination,
        stop: r.stop ?? undefined,
        miles: toNum(r.miles),
        durationMinutes: toNum(r.duration_minutes),
        price: toNum(r.price),
        received: !!r.received,
        status: (r.status || "pending") as TripStatus,
        startedAt: r.started_at ? toIso(r.started_at) : undefined,
        finishedAt: r.finished_at ? toIso(r.finished_at) : undefined,
        notes: r.notes ?? undefined,
        createdAt: toIso(r.created_at),
      };
    },

    async update(id: string, input: Partial<TripUpdateInput>) {
      if (!pool) {
        const idx = memTrips.findIndex((t) => t.id === id);
        if (idx === -1) return { error: "Trip not found" as const };
        memTrips[idx] = { ...memTrips[idx], ...input, received: input.received ?? memTrips[idx].received ?? false };
        return { trip: memTrips[idx] };
      }
      
      // Build update query dynamically based on what fields are provided
      const updates: string[] = [];
      const params: any[] = [id];
      let paramIndex = 2;
      
      if (input.driverId !== undefined) {
        updates.push(`driver_id = $${paramIndex}`);
        params.push(input.driverId);
        paramIndex++;
      }
      if (input.clientId !== undefined) {
        updates.push(`client_id = $${paramIndex}`);
        params.push(input.clientId ?? null);
        paramIndex++;
      }
      if (input.companyId !== undefined) {
        updates.push(`company_id = $${paramIndex}`);
        params.push(input.companyId);
        paramIndex++;
      }
      if (input.vehicleId !== undefined) {
        updates.push(`vehicle_id = $${paramIndex}`);
        params.push(input.vehicleId ?? null);
        paramIndex++;
      }
      if (input.tripType !== undefined) {
        updates.push(`trip_type = $${paramIndex}`);
        params.push(input.tripType ?? "transfer");
        paramIndex++;
      }
      if (input.hourlyStartTime !== undefined) {
        updates.push(`hourly_start_time = $${paramIndex}`);
        params.push(input.hourlyStartTime ?? null);
        paramIndex++;
      }
      if (input.hourlyEndTime !== undefined) {
        updates.push(`hourly_end_time = $${paramIndex}`);
        params.push(input.hourlyEndTime ?? null);
        paramIndex++;
      }
      if (input.vehicleType !== undefined) {
        updates.push(`vehicle_type = $${paramIndex}`);
        params.push(input.vehicleType ?? null);
        paramIndex++;
      }
      if (input.cnf !== undefined) {
        updates.push(`cnf = $${paramIndex}`);
        params.push(input.cnf ?? null);
        paramIndex++;
      }
      if (input.flightNumber !== undefined) {
        updates.push(`flight_number = $${paramIndex}`);
        params.push(input.flightNumber ?? null);
        paramIndex++;
      }
      if (input.clientPhone !== undefined) {
        updates.push(`client_phone = coalesce($${paramIndex}, client_phone)`);
        params.push(input.clientPhone ?? null);
        paramIndex++;
      }
      if (input.meetGreet !== undefined) {
        updates.push(`meet_greet = coalesce($${paramIndex}, meet_greet)`);
        params.push(input.meetGreet ?? null);
        paramIndex++;
      }
      if (input.startAt !== undefined) {
        updates.push(`start_at = $${paramIndex}`);
        params.push(input.startAt);
        paramIndex++;
      }
      if (input.endAt !== undefined) {
        updates.push(`end_at = $${paramIndex}`);
        params.push(input.endAt);
        paramIndex++;
      }
      if (input.origin !== undefined) {
        updates.push(`origin = $${paramIndex}`);
        params.push(input.origin);
        paramIndex++;
      }
      if (input.destination !== undefined) {
        updates.push(`destination = $${paramIndex}`);
        params.push(input.destination);
        paramIndex++;
      }
      if (input.stop !== undefined) {
        updates.push(`stop = $${paramIndex}`);
        params.push(input.stop ?? null);
        paramIndex++;
      }
      if (input.miles !== undefined) {
        updates.push(`miles = $${paramIndex}`);
        params.push(input.miles);
        paramIndex++;
      }
      if (input.durationMinutes !== undefined) {
        updates.push(`duration_minutes = $${paramIndex}`);
        params.push(input.durationMinutes);
        paramIndex++;
      }
      if (input.price !== undefined) {
        updates.push(`price = $${paramIndex}`);
        params.push(input.price);
        paramIndex++;
      }
      if (input.received !== undefined) {
        updates.push(`received = coalesce($${paramIndex}, received)`);
        params.push(input.received ?? null);
        paramIndex++;
      }
      if (input.status !== undefined) {
        updates.push(`status = $${paramIndex}`);
        params.push(input.status);
        paramIndex++;
      }
      if (input.startedAt !== undefined) {
        updates.push(`started_at = $${paramIndex}`);
        params.push(input.startedAt ? new Date(input.startedAt).toISOString() : null);
        paramIndex++;
      }
      if (input.finishedAt !== undefined) {
        updates.push(`finished_at = $${paramIndex}`);
        params.push(input.finishedAt ? new Date(input.finishedAt).toISOString() : null);
        paramIndex++;
      }
      if (input.notes !== undefined) {
        updates.push(`notes = $${paramIndex}`);
        params.push(input.notes ?? null);
        paramIndex++;
      }
      
      if (updates.length === 0) {
        // No updates, just return the current trip
        const res = await pool.query(`select id, created_by_user_id, driver_id, client_id, company_id, vehicle_id, trip_type, hourly_start_time, hourly_end_time, vehicle_type, cnf, flight_number, meet_greet, client_phone, start_at, end_at, origin, destination, stop, miles, duration_minutes, price, received, status, started_at, finished_at, notes, created_at from trips where id=$1`, [id]);
        if (!res.rowCount) return { error: "Trip not found" as const };
        const r = res.rows[0];
        return {
          trip: {
            id: r.id,
            createdByUserId: r.created_by_user_id,
            driverId: r.driver_id,
            clientId: r.client_id ?? null,
            companyId: r.company_id,
            vehicleId: r.vehicle_id ?? null,
            tripType: r.trip_type ?? "transfer",
            hourlyStartTime: r.hourly_start_time ?? undefined,
            hourlyEndTime: r.hourly_end_time ?? undefined,
            vehicleType: r.vehicle_type ?? null,
            cnf: r.cnf ?? undefined,
            flightNumber: r.flight_number ?? undefined,
            meetGreet: typeof r.meet_greet === "string" && r.meet_greet.trim() ? r.meet_greet : undefined,
            clientPhone: typeof r.client_phone === "string" && r.client_phone.trim() ? r.client_phone : undefined,
            startAt: toIso(r.start_at),
            endAt: toIso(r.end_at),
            origin: r.origin,
            destination: r.destination,
            stop: r.stop ?? undefined,
            miles: toNum(r.miles),
            durationMinutes: toNum(r.duration_minutes),
            price: toNum(r.price),
            received: !!r.received,
            status: (r.status || "pending") as TripStatus,
            startedAt: r.started_at ? toIso(r.started_at) : undefined,
            finishedAt: r.finished_at ? toIso(r.finished_at) : undefined,
            notes: r.notes ?? undefined,
            createdAt: toIso(r.created_at),
          },
        };
      }
      
      const res = await pool.query(
        `update trips set ${updates.join(", ")} where id=$1 returning id, created_by_user_id, driver_id, client_id, company_id, vehicle_id, trip_type, hourly_start_time, hourly_end_time, vehicle_type, cnf, flight_number, meet_greet, client_phone, start_at, end_at, origin, destination, stop, miles, duration_minutes, price, received, status, started_at, finished_at, notes, created_at`,
        params
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
          vehicleId: r.vehicle_id ?? null,
          tripType: r.trip_type ?? "transfer",
          hourlyStartTime: r.hourly_start_time ?? undefined,
          hourlyEndTime: r.hourly_end_time ?? undefined,
          vehicleType: r.vehicle_type ?? null,
          cnf: r.cnf ?? undefined,
          flightNumber: r.flight_number ?? undefined,
          meetGreet: typeof r.meet_greet === "string" && r.meet_greet.trim() ? r.meet_greet : undefined,
          clientPhone: typeof r.client_phone === "string" && r.client_phone.trim() ? r.client_phone : undefined,
          startAt: toIso(r.start_at),
          endAt: toIso(r.end_at),
          origin: r.origin,
          destination: r.destination,
          stop: r.stop ?? undefined,
          miles: toNum(r.miles),
          durationMinutes: toNum(r.duration_minutes),
          price: toNum(r.price),
          received: !!r.received,
          status: (r.status || "pending") as TripStatus,
          startedAt: r.started_at ? toIso(r.started_at) : undefined,
          finishedAt: r.finished_at ? toIso(r.finished_at) : undefined,
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
        `update trips set received=$2 where id=$1 returning id, created_by_user_id, driver_id, client_id, company_id, vehicle_id, trip_type, hourly_start_time, hourly_end_time, vehicle_type, cnf, flight_number, meet_greet, client_phone, start_at, end_at, origin, destination, stop, miles, duration_minutes, price, received, status, started_at, finished_at, notes, created_at`,
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
          vehicleId: r.vehicle_id ?? null,
          tripType: r.trip_type ?? "transfer",
          hourlyStartTime: r.hourly_start_time ?? undefined,
          hourlyEndTime: r.hourly_end_time ?? undefined,
          vehicleType: r.vehicle_type ?? null,
          cnf: r.cnf ?? undefined,
          flightNumber: r.flight_number ?? undefined,
          meetGreet: typeof r.meet_greet === "string" && r.meet_greet.trim() ? r.meet_greet : undefined,
          clientPhone: typeof r.client_phone === "string" && r.client_phone.trim() ? r.client_phone : undefined,
          startAt: toIso(r.start_at),
          endAt: toIso(r.end_at),
          origin: r.origin,
          destination: r.destination,
          stop: r.stop ?? undefined,
          miles: toNum(r.miles),
          durationMinutes: toNum(r.duration_minutes),
          price: toNum(r.price),
          received: !!r.received,
          status: (r.status || "pending") as TripStatus,
          startedAt: r.started_at ? toIso(r.started_at) : undefined,
          finishedAt: r.finished_at ? toIso(r.finished_at) : undefined,
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
        `delete from trips where id=$1 returning id, created_by_user_id, driver_id, client_id, company_id, vehicle_id, trip_type, hourly_start_time, hourly_end_time, vehicle_type, cnf, flight_number, meet_greet, client_phone, start_at, end_at, origin, destination, stop, miles, duration_minutes, price, received, status, started_at, finished_at, notes, created_at`,
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
          vehicleId: r.vehicle_id ?? null,
          tripType: r.trip_type ?? "transfer",
          hourlyStartTime: r.hourly_start_time ?? undefined,
          hourlyEndTime: r.hourly_end_time ?? undefined,
          vehicleType: r.vehicle_type ?? null,
          cnf: r.cnf ?? undefined,
          flightNumber: r.flight_number ?? undefined,
          meetGreet: typeof r.meet_greet === "string" && r.meet_greet.trim() ? r.meet_greet : undefined,
          clientPhone: typeof r.client_phone === "string" && r.client_phone.trim() ? r.client_phone : undefined,
          startAt: toIso(r.start_at),
          endAt: toIso(r.end_at),
          origin: r.origin,
          destination: r.destination,
          stop: r.stop ?? undefined,
          miles: toNum(r.miles),
          durationMinutes: toNum(r.duration_minutes),
          price: toNum(r.price),
          received: !!r.received,
          status: (r.status || "pending") as TripStatus,
          startedAt: r.started_at ? toIso(r.started_at) : undefined,
          finishedAt: r.finished_at ? toIso(r.finished_at) : undefined,
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

  settings: {
    async get(): Promise<AppSettings> {
      if (!pool) return memSettings;
      const res = await pool.query(
        `select id, owner_company_id, logo_data_url, enabled_modules, created_at, updated_at
         from app_settings where id='main' limit 1`
      );
      if (!res.rowCount) {
        const createdAt = nowIso();
        const insert = await pool.query(
          `insert into app_settings (id, owner_company_id, logo_data_url, enabled_modules, created_at, updated_at)
           values ('main', null, null, $1, $2, $2)
           returning id, owner_company_id, logo_data_url, enabled_modules, created_at, updated_at`,
          [defaultModules, createdAt]
        );
        return toSettings(insert.rows[0]);
      }
      return toSettings(res.rows[0]);
    },

    async update(input: { ownerCompanyId?: string | null; logoDataUrl?: string | null; enabledModules?: string[] }) {
      if (!pool) {
        memSettings.ownerCompanyId = input.ownerCompanyId ?? memSettings.ownerCompanyId ?? null;
        if (input.logoDataUrl !== undefined) memSettings.logoDataUrl = input.logoDataUrl;
        if (input.enabledModules !== undefined) memSettings.enabledModules = input.enabledModules;
        memSettings.updatedAt = nowIso();
        return memSettings;
      }
      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;
      if (input.ownerCompanyId !== undefined) {
        updates.push(`owner_company_id = $${paramIndex++}`);
        params.push(input.ownerCompanyId ?? null);
      }
      if (input.logoDataUrl !== undefined) {
        updates.push(`logo_data_url = $${paramIndex++}`);
        params.push(input.logoDataUrl ?? null);
      }
      if (input.enabledModules !== undefined) {
        updates.push(`enabled_modules = $${paramIndex++}`);
        params.push(input.enabledModules);
      }
      updates.push(`updated_at = $${paramIndex++}`);
      params.push(nowIso());
      const res = await pool.query(
        `update app_settings set ${updates.join(", ")} where id='main'
         returning id, owner_company_id, logo_data_url, enabled_modules, created_at, updated_at`,
        params
      );
      if (!res.rowCount) {
        const inserted = await pool.query(
          `insert into app_settings (id, owner_company_id, logo_data_url, enabled_modules, created_at, updated_at)
           values ('main', $1, $2, $3, $4, $4)
           returning id, owner_company_id, logo_data_url, enabled_modules, created_at, updated_at`,
          [input.ownerCompanyId ?? null, input.logoDataUrl ?? null, input.enabledModules ?? defaultModules, nowIso()]
        );
        return toSettings(inserted.rows[0]);
      }
      return toSettings(res.rows[0]);
    },
  },
};


