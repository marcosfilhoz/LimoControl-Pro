import { clearToken, getToken } from "./storage";

const API_URL: string = import.meta.env.VITE_API_URL || "";

export type ApiError = { error: string } | { error: unknown };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL) {
    throw {
      status: 0,
      body: { error: "VITE_API_URL is not configured in the frontend (Vercel)." },
    };
  }

  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timeoutMs = 15000;
  const t = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers, signal: controller.signal });
  } catch (e: any) {
    // e.name === 'AbortError' when timed out
    throw {
      status: 0,
      body: {
        error:
          e?.name === "AbortError"
            ? `Timeout (${timeoutMs}ms) while connecting to the API.`
            : "Network error while connecting to the API.",
      },
    };
  } finally {
    clearTimeout(t);
  }
  if (res.status === 401) {
    clearToken();
  }
  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const body = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    throw { status: res.status, body };
  }
  return body as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: { id: string; name: string; email: string; role: string } }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) },
    ),

  dashboard: () =>
    request<{ totalTrips: number; totalRevenue: number; totalMiles: number; avgDurationMinutes: number }>(
      "/dashboard",
    ),

  driversList: () => request<Array<{ id: string; name: string; phone?: string; license?: string; active: boolean }>>("/drivers"),
  driverCreate: (data: { name: string; phone?: string; license?: string }) =>
    request("/drivers", { method: "POST", body: JSON.stringify(data) }),
  driverUpdate: (id: string, data: { name: string; phone?: string; license?: string }) =>
    request(`/drivers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  driverDelete: (id: string) => request(`/drivers/${id}`, { method: "DELETE" }),
  driverSetActive: (id: string, active: boolean) =>
    request(`/drivers/${id}/active`, { method: "PATCH", body: JSON.stringify({ active }) }),

  clientsList: () => request<Array<{ id: string; name: string; contact?: string; active: boolean }>>("/clients"),
  clientCreate: (data: { name: string; contact?: string }) => request("/clients", { method: "POST", body: JSON.stringify(data) }),
  clientUpdate: (id: string, data: { name: string; contact?: string }) =>
    request(`/clients/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  clientDelete: (id: string) => request(`/clients/${id}`, { method: "DELETE" }),
  clientSetActive: (id: string, active: boolean) =>
    request(`/clients/${id}/active`, { method: "PATCH", body: JSON.stringify({ active }) }),

  companiesList: () => request<Array<{ id: string; name: string; phone?: string; active: boolean }>>("/companies"),
  companyCreate: (data: { name: string; phone?: string }) => request("/companies", { method: "POST", body: JSON.stringify(data) }),
  companyUpdate: (id: string, data: { name: string; phone?: string }) =>
    request(`/companies/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  companyDelete: (id: string) => request(`/companies/${id}`, { method: "DELETE" }),
  companySetActive: (id: string, active: boolean) =>
    request(`/companies/${id}/active`, { method: "PATCH", body: JSON.stringify({ active }) }),

  usersList: () => request<Array<{ id: string; name: string; email: string; role: string; createdAt: string }>>("/users"),
  userCreate: (data: { name: string; email: string; password: string; role: "admin" | "user" }) =>
    request("/users", { method: "POST", body: JSON.stringify(data) }),
  userUpdate: (id: string, data: { name?: string; role?: "admin" | "user" }) =>
    request(`/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  userDelete: (id: string) => request(`/users/${id}`, { method: "DELETE" }),
  userResetPassword: (id: string) => request(`/users/${id}/reset-password`, { method: "POST" }),

  tripsList: () =>
    request<
      Array<{
        id: string;
        driverId: string;
        clientId: string | null;
        companyId: string;
        vehicleType?: "SUV" | "Sedan" | null;
        cnf?: string;
        flightNumber?: string;
        // Free-text (e.g., greeter name / instructions). Empty/undefined means no meet & greet.
        meetGreet?: string | null;
        clientPhone?: string;
        startAt: string;
        endAt: string;
        origin: string;
        destination: string;
        miles: number;
        durationMinutes: number;
        price: number;
        received: boolean;
        notes?: string;
      }>
    >("/trips"),
  tripCreate: (data: {
    driverId: string;
    clientName?: string;
    companyId: string;
    vehicleType?: "SUV" | "Sedan" | null;
    cnf?: string;
    flightNumber?: string;
    meetGreet?: string;
    clientPhone?: string;
    startAt: string;
    endAt: string;
    origin: string;
    destination: string;
    miles: number;
    durationMinutes: number;
    price: number;
    received?: boolean;
    notes?: string;
  }) => request("/trips", { method: "POST", body: JSON.stringify(data) }),
  tripSetReceived: (id: string, received: boolean) =>
    request(`/trips/${id}/received`, { method: "PATCH", body: JSON.stringify({ received }) }),
  tripDelete: (id: string) => request(`/trips/${id}`, { method: "DELETE" }),
};


