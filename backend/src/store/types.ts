export type Role = "admin" | "user";

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: string;
}

export interface Driver {
  id: string;
  name: string;
  phone?: string;
  license?: string;
  active: boolean;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  companyId?: string;
  active: boolean;
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  phone?: string;
  active: boolean;
  createdAt: string;
}

export interface Trip {
  id: string;
  createdByUserId: string;
  driverId: string;
  clientId: string | null;
  companyId: string;
  vehicleType?: "SUV" | "Sedan" | "Economy" | null;
  cnf?: string;
  flightNumber?: string;
  // Free-text (e.g., greeter name / instructions). Empty/undefined means no meet & greet.
  meetGreet?: string | null;
  // Optional contact phone for this trip (not necessarily the client master record).
  clientPhone?: string;
  startAt: string;
  endAt: string;
  origin: string;
  destination: string;
  stop?: string;
  miles: number;
  durationMinutes: number;
  price: number;
  received: boolean;
  notes?: string;
  createdAt: string;
}

