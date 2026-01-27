export type Role = "admin" | "user" | "driver" | "dev";

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  driverId?: string;
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

export interface Vehicle {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  year?: number;
  plate?: string;
  companyId: string;
  active: boolean;
  createdAt: string;
}

export interface AppSettings {
  id: string;
  ownerCompanyId?: string | null;
  logoDataUrl?: string | null;
  enabledModules: string[];
  createdAt: string;
  updatedAt: string;
}

export type TripStatus = "pending" | "in_progress" | "on_stop" | "completed";

export interface Trip {
  id: string;
  createdByUserId: string;
  driverId: string;
  clientId: string | null;
  companyId: string;
  vehicleId?: string | null;
  tripType?: "transfer" | "hourly";
  hourlyStartTime?: string;
  hourlyEndTime?: string;
  vehicleType?: "SUV" | "Sedan" | "Economy" | "First Class" | null;
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
  status: TripStatus;
  // Timestamps for tracking actual trip execution
  startedAt?: string; // When driver clicked "Start"
  finishedAt?: string; // When driver clicked "Finish"
  notes?: string;
  createdAt: string;
}

