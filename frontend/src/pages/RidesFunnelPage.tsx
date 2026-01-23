import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/Button";
import { DateFilterInput } from "../components/DateFilterInput";
import { api } from "../lib/api";

type Trip = {
  id: string;
  driverId: string;
  clientId: string | null;
  companyId: string;
  tripType?: "transfer" | "hourly";
  hourlyStartTime?: string;
  hourlyEndTime?: string;
  vehicleType?: "SUV" | "Sedan" | "Economy" | "First Class" | null;
  cnf?: string;
  flightNumber?: string;
  meetGreet?: string | null;
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
  status: "pending" | "in_progress" | "on_stop" | "completed";
  startedAt?: string;
  finishedAt?: string;
  notes?: string;
};

type StatusFilter = "all" | "pending" | "in_progress" | "on_stop" | "completed" | "active";

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getStatusBadgeColor(status: Trip["status"]): string {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "in_progress":
      return "bg-blue-100 text-blue-800";
    case "on_stop":
      return "bg-orange-100 text-orange-800";
    case "completed":
      return "bg-green-100 text-green-800";
    default:
      return "bg-slate-100 text-slate-800";
  }
}

function getStatusLabel(status: Trip["status"]): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "in_progress":
      return "In Progress";
    case "on_stop":
      return "On Stop";
    case "completed":
      return "Completed";
    default:
      return status;
  }
}

export function DriverTripsPage() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [drivers, setDrivers] = useState<Array<{ id: string; name: string; active?: boolean }>>([]);
  const [clients, setClients] = useState<Array<{ id: string; name: string; active?: boolean }>>([]);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string; active?: boolean }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<Set<string>>(new Set());

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterDriverId, setFilterDriverId] = useState("");
  const [filterClientId, setFilterClientId] = useState("");
  const [filterCompanyId, setFilterCompanyId] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([api.tripsList(), api.driversList(), api.clientsList(), api.companiesList()])
      .then(([t, d, c, co]) => {
        if (alive) {
          setTrips(t);
          setDrivers(d);
          setClients(c);
          setCompanies(co);
        }
      })
      .catch((e: any) => {
        if (alive) {
          console.error("Error loading rides:", e);
          setError(e?.body?.error || "Could not load rides.");
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const filteredTrips = useMemo(() => {
    let filtered = [...trips];

    // Filter by status
    if (statusFilter === "active") {
      filtered = filtered.filter((t) => t.status === "pending" || t.status === "in_progress" || t.status === "on_stop");
    } else if (statusFilter !== "all") {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }

    // Filter by driver
    if (filterDriverId) {
      filtered = filtered.filter((t) => t.driverId === filterDriverId);
    }

    // Filter by client
    if (filterClientId) {
      filtered = filtered.filter((t) => t.clientId === filterClientId);
    }

    // Filter by company
    if (filterCompanyId) {
      filtered = filtered.filter((t) => t.companyId === filterCompanyId);
    }

    // Filter by date
    if (filterFrom) {
      const fromDate = new Date(filterFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((t) => {
        const tripDate = new Date(t.startAt);
        return tripDate >= fromDate;
      });
    }
    if (filterTo) {
      const toDate = new Date(filterTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((t) => {
        const tripDate = new Date(t.startAt);
        return tripDate <= toDate;
      });
    }

    // Sort by most recent first
    filtered.sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());

    return filtered;
  }, [trips, statusFilter, filterFrom, filterTo, filterDriverId, filterClientId, filterCompanyId]);

  const driverById = useMemo(() => new Map(drivers.map((d) => [d.id, d.name])), [drivers]);
  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);
  const companyById = useMemo(() => new Map(companies.map((co) => [co.id, co.name])), [companies]);

  async function updateStatus(tripId: string, action: "start" | "pause" | "resume" | "finish") {
    setUpdating((prev) => new Set(prev).add(tripId));
    setError(null);
    try {
      let updatedTrip: Trip;
      switch (action) {
        case "start":
          updatedTrip = await api.tripStart(tripId);
          break;
        case "pause":
          updatedTrip = await api.tripPause(tripId);
          break;
        case "resume":
          updatedTrip = await api.tripResume(tripId);
          break;
        case "finish":
          updatedTrip = await api.tripFinish(tripId);
          break;
      }
      setTrips((prev) => prev.map((t) => (t.id === tripId ? updatedTrip : t)));
    } catch (e: any) {
      setError(e?.body?.error || `Could not ${action} the ride.`);
    } finally {
      setUpdating((prev) => {
        const next = new Set(prev);
        next.delete(tripId);
        return next;
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xl font-semibold">Driver Trips</div>
          <div className="text-sm text-slate-600">
            Showing {filteredTrips.length}/{trips.length} rides
            {user?.role === "driver" && " (your rides only)"}
          </div>
        </div>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 text-sm font-medium text-slate-700">Filters</div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
            <select
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            >
              <option value="active">Active (Pending, In Progress, On Stop)</option>
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="on_stop">On Stop</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          {user?.role !== "driver" && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Driver</label>
                <select
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  value={filterDriverId}
                  onChange={(e) => setFilterDriverId(e.target.value)}
                >
                  <option value="">All drivers</option>
                  {drivers
                    .filter((d) => d.active !== false)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Client</label>
                <select
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  value={filterClientId}
                  onChange={(e) => setFilterClientId(e.target.value)}
                >
                  <option value="">All clients</option>
                  {clients
                    .filter((c) => c.active !== false)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Company</label>
                <select
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  value={filterCompanyId}
                  onChange={(e) => setFilterCompanyId(e.target.value)}
                >
                  <option value="">All companies</option>
                  {companies
                    .filter((co) => co.active !== false)
                    .map((co) => (
                      <option key={co.id} value={co.id}>
                        {co.name}
                      </option>
                    ))}
                </select>
              </div>
            </>
          )}
          <DateFilterInput label="From Date" value={filterFrom} onChange={setFilterFrom} />
          <DateFilterInput label="To Date" value={filterTo} onChange={setFilterTo} />
        </div>
        {(filterFrom || filterTo || filterDriverId || filterClientId || filterCompanyId || statusFilter !== "active") && (
          <div className="mt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setFilterFrom("");
                setFilterTo("");
                setFilterDriverId("");
                setFilterClientId("");
                setFilterCompanyId("");
                setStatusFilter("active");
              }}
            >
              Clear all filters
            </Button>
          </div>
        )}
      </div>

      {/* Rides List */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-600">Loading rides...</div>
        ) : filteredTrips.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-600">No rides found.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTrips.map((trip) => (
              <div key={trip.id} className="p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex-1 space-y-3">
                    {/* Header with status and basic info */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeColor(trip.status)}`}>
                        {getStatusLabel(trip.status)}
                      </span>
                      <span className="text-sm text-slate-600">
                        {formatDate(trip.startAt)} • {trip.tripType === "hourly" ? "Hourly" : "Transfer"}
                      </span>
                      {trip.vehicleType && (
                        <span className="text-sm text-slate-600">• {trip.vehicleType}</span>
                      )}
                    </div>

                    {/* Route */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <span className="text-sm font-medium text-slate-900">{trip.origin}</span>
                      </div>
                      {trip.stop && (
                        <div className="flex items-center gap-2 pl-4">
                          <div className="h-2 w-2 rounded-full bg-yellow-500" />
                          <span className="text-sm text-slate-700">{trip.stop}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-red-500" />
                        <span className="text-sm font-medium text-slate-900">{trip.destination}</span>
                      </div>
                    </div>

                    {/* Details grid */}
                    <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <span className="text-slate-600">Driver: </span>
                        <span className="font-medium text-slate-900">{driverById.get(trip.driverId) || trip.driverId}</span>
                      </div>
                      {trip.clientId && (
                        <div>
                          <span className="text-slate-600">Client: </span>
                          <span className="font-medium text-slate-900">{clientById.get(trip.clientId) || trip.clientId}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-600">Company: </span>
                        <span className="font-medium text-slate-900">{companyById.get(trip.companyId) || trip.companyId}</span>
                      </div>
                      {trip.cnf && (
                        <div>
                          <span className="text-slate-600">CNF: </span>
                          <span className="font-medium text-slate-900">{trip.cnf}</span>
                        </div>
                      )}
                      {trip.flightNumber && (
                        <div>
                          <span className="text-slate-600">Flight: </span>
                          <span className="font-medium text-slate-900">{trip.flightNumber}</span>
                        </div>
                      )}
                      {trip.meetGreet && (
                        <div>
                          <span className="text-slate-600">Meet & Greet: </span>
                          <span className="font-medium text-slate-900">{trip.meetGreet}</span>
                        </div>
                      )}
                      {trip.clientPhone && (
                        <div>
                          <span className="text-slate-600">Phone: </span>
                          <span className="font-medium text-slate-900">{trip.clientPhone}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-600">Miles: </span>
                        <span className="font-medium text-slate-900">{trip.miles}</span>
                      </div>
                      <div>
                        <span className="text-slate-600">Duration: </span>
                        <span className="font-medium text-slate-900">
                          {trip.status === "completed" && trip.finishedAt && trip.startedAt
                            ? `${trip.durationMinutes} min (calculated)`
                            : `${trip.durationMinutes} min`}
                        </span>
                      </div>
                      {trip.hourlyStartTime && trip.hourlyEndTime && (
                        <>
                          <div>
                            <span className="text-slate-600">Hourly Start: </span>
                            <span className="font-medium text-slate-900">{trip.hourlyStartTime}</span>
                          </div>
                          <div>
                            <span className="text-slate-600">Hourly End: </span>
                            <span className="font-medium text-slate-900">{trip.hourlyEndTime}</span>
                          </div>
                        </>
                      )}
                      <div>
                        <span className="text-slate-600">Start: </span>
                        <span className="font-medium text-slate-900">{formatDateTime(trip.startAt)}</span>
                      </div>
                      <div>
                        <span className="text-slate-600">End: </span>
                        <span className="font-medium text-slate-900">{formatDateTime(trip.endAt)}</span>
                      </div>
                    </div>

                    {trip.notes && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                        <div className="text-xs font-medium text-slate-600">Notes:</div>
                        <div className="text-sm text-slate-700">{trip.notes}</div>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col gap-2 md:min-w-[140px]">
                    {trip.status === "pending" && (
                      <Button
                        onClick={() => updateStatus(trip.id, "start")}
                        disabled={updating.has(trip.id)}
                        className="w-full"
                      >
                        {updating.has(trip.id) ? "Starting..." : "Start"}
                      </Button>
                    )}
                    {trip.status === "in_progress" && (
                      <>
                        <Button
                          onClick={() => updateStatus(trip.id, "pause")}
                          disabled={updating.has(trip.id)}
                          variant="ghost"
                          className="w-full"
                        >
                          {updating.has(trip.id) ? "Pausing..." : "Pause"}
                        </Button>
                        <Button
                          onClick={() => updateStatus(trip.id, "finish")}
                          disabled={updating.has(trip.id)}
                          className="w-full"
                        >
                          {updating.has(trip.id) ? "Finishing..." : "Finish"}
                        </Button>
                      </>
                    )}
                    {trip.status === "on_stop" && (
                      <>
                        <Button
                          onClick={() => updateStatus(trip.id, "resume")}
                          disabled={updating.has(trip.id)}
                          className="w-full"
                        >
                          {updating.has(trip.id) ? "Resuming..." : "Resume"}
                        </Button>
                        <Button
                          onClick={() => updateStatus(trip.id, "finish")}
                          disabled={updating.has(trip.id)}
                          className="w-full"
                        >
                          {updating.has(trip.id) ? "Finishing..." : "Finish"}
                        </Button>
                      </>
                    )}
                    {trip.status === "completed" && (
                      <div className="text-center text-sm text-slate-600">Completed</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
