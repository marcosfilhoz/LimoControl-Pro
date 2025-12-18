import bcrypt from "bcryptjs";
import { Client, Company, Driver, Trip, User } from "./types";

const now = () => new Date().toISOString();

function seedPassword(password: string) {
  return bcrypt.hashSync(password, 8);
}

export const users: User[] = [
  {
    id: "u_admin",
    name: "Admin",
    email: "admin@limo.local",
    passwordHash: seedPassword("admin"),
    role: "admin",
    createdAt: now(),
  },
];

export const drivers: Driver[] = [
  { id: "d_1", name: "João Silva", phone: "11999999999", license: "ABC1234", active: true, createdAt: now() },
];

export const clients: Client[] = [
  { id: "c_1", name: "Cliente Demo", contact: "contato@cliente.com", active: true, createdAt: now() },
];

export const companies: Company[] = [
  { id: "co_1", name: "Empresa Parceira Demo", phone: "11988887777", active: true, createdAt: now() },
];

export const trips: Trip[] = [
  {
    id: "t_1",
    createdByUserId: "u_admin",
    driverId: "d_1",
    clientId: "c_1",
    companyId: "co_1",
    vehicleType: "Sedan",
    cnf: "CNF-DEMO",
    flightNumber: "AA123",
    meetGreet: "",
    startAt: now(),
    endAt: now(),
    origin: "São Paulo",
    destination: "Campinas",
    miles: 60,
    durationMinutes: 80,
    price: 250,
    received: false,
    notes: "Viagem inicial demo",
    createdAt: now(),
  },
];

export function generateId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36)}`;
}

