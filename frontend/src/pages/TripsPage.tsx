import React, { useEffect, useMemo, useState } from "react";
import { AutocompleteSelect } from "../components/AutocompleteSelect";
import { Button } from "../components/Button";
import { DateFilterInput } from "../components/DateFilterInput";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { api } from "../lib/api";
import { jsPDF } from "jspdf";

type Trip = {
  id: string;
  driverId: string;
  clientId: string | null;
  companyId: string;
  vehicleType?: "SUV" | "Sedan" | "Economy" | null;
  cnf?: string;
  flightNumber?: string;
  // Free-text (e.g., greeter name / instructions). Empty/undefined means no meet & greet.
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
  notes?: string;
};

type Driver = { id: string; name: string };
type Client = { id: string; name: string; phone?: string; address?: string; active: boolean };
type Company = { id: string; name: string };

export function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // filters
  const [filterWeek, setFilterWeek] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterClientQuery, setFilterClientQuery] = useState("");
  const [filterReceived, setFilterReceived] = useState<"" | "received" | "not_received">("");
  const [filterCompanyId, setFilterCompanyId] = useState("");
  const [filterCnfQuery, setFilterCnfQuery] = useState("");
  const [filterFlightNumberQuery, setFilterFlightNumberQuery] = useState("");
  const [filterMeetGreet, setFilterMeetGreet] = useState<"" | "yes" | "no">("");
  const [filterVehicleType, setFilterVehicleType] = useState<"" | "SUV" | "Sedan" | "Economy">("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [driverId, setDriverId] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [startAt, setStartAt] = useState(() => toLocalInputValue(new Date()));
  const [endAt, setEndAt] = useState(() => toLocalInputValue(new Date()));
  const [cnf, setCnf] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [meetGreet, setMeetGreet] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [stop, setStop] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [vehicleType, setVehicleType] = useState<"SUV" | "Sedan" | "Economy" | "">("");
  const [received, setReceived] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsTrip, setDetailsTrip] = useState<Trip | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([api.tripsList(), api.driversList(), api.clientsList(), api.companiesList()])
      .then(([t, d, c, co]) => {
        if (!alive) return;
        setTrips(t);
        setDrivers(d);
        setClients(c);
        setCompanies(co);
      })
      .catch(() => {
        if (alive) setError("Could not load trips.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!filterWeek) {
      if (!filterMonth) {
        // only clear when no other period preset is active
        setFilterFrom("");
        setFilterTo("");
      }
      return;
    }
    const range = isoWeekToRange(filterWeek);
    if (!range) return;
    setFilterFrom(formatUsDateOnly(range.from));
    setFilterTo(formatUsDateOnly(range.to));
  }, [filterWeek, filterMonth]);

  useEffect(() => {
    if (!filterMonth) {
      if (!filterWeek) {
        setFilterFrom("");
        setFilterTo("");
      }
      return;
    }
    const range = isoMonthToRange(filterMonth);
    if (!range) return;
    setFilterFrom(formatUsDateOnly(range.from));
    setFilterTo(formatUsDateOnly(range.to));
  }, [filterMonth, filterWeek]);

  const driverById = useMemo(() => new Map(drivers.map((d) => [d.id, d.name])), [drivers]);
  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);
  const companyById = useMemo(() => new Map(companies.map((c) => [c.id, c.name])), [companies]);
  const companyOptions = useMemo(
    () => companies.map((c: any) => ({ id: c.id, label: c.name, disabled: c.active === false })),
    [companies],
  );
  const clientOptions = useMemo(
    () => clients.map((c: any) => ({ id: c.id, label: c.name, disabled: c.active === false })),
    [clients],
  );

  const filterCompanyOptions = useMemo(
    () => [{ id: "", label: "All companies" }, ...companyOptions],
    [companyOptions],
  );

  const filteredTrips = useMemo(() => {
    const from = parseUsDateOnly(filterFrom);
    const to = parseUsDateOnly(filterTo);
    const fromBound = from ? startOfDay(from) : null;
    const toBound = to ? endOfDay(to) : null;
    const qClient = filterClientQuery.trim().toLowerCase();
    const qCnf = filterCnfQuery.trim().toLowerCase();
    const qFlight = filterFlightNumberQuery.trim().toLowerCase();
    return trips.filter((t) => {
      const dt = new Date(t.startAt);
      if (fromBound && dt < fromBound) return false;
      if (toBound && dt > toBound) return false;
      if (qClient) {
        const clientLabel = (t.clientId ? clientById.get(t.clientId) : "")?.toLowerCase?.() || "";
        if (!clientLabel.includes(qClient)) return false;
      }
      if (qCnf) {
        const v = (t.cnf || "").toLowerCase();
        if (!v.includes(qCnf)) return false;
      }
      if (qFlight) {
        const v = (t.flightNumber || "").toLowerCase();
        if (!v.includes(qFlight)) return false;
      }
      if (filterCompanyId && t.companyId !== filterCompanyId) return false;
      if (filterVehicleType && (t.vehicleType || "") !== filterVehicleType) return false;
      if (filterReceived === "received" && !t.received) return false;
      if (filterReceived === "not_received" && t.received) return false;
      const hasMg = hasMeetGreet(t.meetGreet);
      if (filterMeetGreet === "yes" && !hasMg) return false;
      if (filterMeetGreet === "no" && hasMg) return false;
      return true;
    });
  }, [
    trips,
    filterFrom,
    filterTo,
    filterClientQuery,
    filterCnfQuery,
    filterFlightNumberQuery,
    filterMeetGreet,
    filterVehicleType,
    filterCompanyId,
    filterReceived,
    clientById,
  ]);

  async function refresh() {
    const [t, d, c, co] = await Promise.all([api.tripsList(), api.driversList(), api.clientsList(), api.companiesList()]);
    setTrips(t);
    setDrivers(d);
    setClients(c);
    setCompanies(co);
  }

  function openCreate() {
    setError(null);
    setSaving(false);
    setEditingTrip(null);
    setDriverId(drivers.find((d: any) => d.active !== false)?.id || drivers[0]?.id || "");
    const defaultClientId = clients.find((c: any) => c.active !== false)?.id || clients[0]?.id || "";
    setClientId(defaultClientId);
    const defaultClient = defaultClientId ? clients.find((c) => c.id === defaultClientId) : null;
    setClientPhone(defaultClient?.phone ? String(defaultClient.phone) : "");
    setCompanyId(companies.find((c: any) => c.active !== false)?.id || companies[0]?.id || "");
    const dt = toLocalInputValue(new Date());
    setStartAt(dt);
    setEndAt(dt);
    setCnf("");
    setFlightNumber("");
    setMeetGreet("");
    setOrigin("");
    setDestination("");
    setStop("");
    setPrice("");
    setNotes("");
    setVehicleType("");
    setReceived(false);
    setModalOpen(true);
  }

  function openEdit(trip: Trip) {
    setError(null);
    setSaving(false);
    setEditingTrip(trip);
    setDriverId(trip.driverId);
    setClientId(trip.clientId || "");
    setClientPhone(trip.clientPhone ? String(trip.clientPhone) : "");
    setCompanyId(trip.companyId);
    const startAtValue = toLocalInputValue(new Date(trip.startAt));
    setStartAt(startAtValue);
    setEndAt(startAtValue); // Keep endAt equal to startAt for backend compatibility
    setCnf(trip.cnf || "");
    setFlightNumber(trip.flightNumber || "");
    setMeetGreet(trip.meetGreet || "");
    setOrigin(trip.origin);
    setDestination(trip.destination);
    setStop(trip.stop || "");
    setPrice(String(trip.price));
    setNotes(trip.notes || "");
    setVehicleType(trip.vehicleType || "");
    setReceived(trip.received);
    setDetailsOpen(false);
    setModalOpen(true);
  }

  async function submit() {
    if (saving) return;
    setError(null);
    setSaving(true);
    try {
      // Single date/time: keep endAt equal to startAt for backend compatibility
      const endAtOut = startAt;
      const meetGreetOut = meetGreet.trim();
      const clientPhoneOut = clientPhone.trim();
      const tripData = {
        driverId,
        clientId: clientId.trim() ? clientId : undefined,
        clientPhone: clientPhoneOut ? clientPhoneOut : undefined,
        companyId,
        vehicleType: vehicleType ? (vehicleType as any) : null,
        cnf: cnf.trim() ? cnf.trim() : undefined,
        flightNumber: flightNumber.trim() ? flightNumber.trim() : undefined,
        meetGreet: meetGreetOut ? meetGreetOut : undefined,
        startAt: fromLocalInputValue(startAt),
        endAt: fromLocalInputValue(endAtOut),
        origin,
        destination,
        stop: stop.trim() ? stop.trim() : undefined,
        miles: editingTrip?.miles || 0,
        durationMinutes: editingTrip?.durationMinutes || 0,
        price: Number(price) || 0,
        received,
        notes: notes || undefined,
      };
      if (editingTrip) {
        await api.tripUpdate(editingTrip.id, tripData);
      } else {
        await api.tripCreate(tripData);
      }
      setModalOpen(false);
      await refresh();
    } catch {
      setError("Could not save the trip.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTrip(t: Trip) {
    if (t.received) {
      setError("Paid trips cannot be deleted.");
      return;
    }
    if (!confirm("Delete this trip? This action cannot be undone.")) return;
    setError(null);
    try {
      await api.tripDelete(t.id);
      setDetailsOpen(false);
      setDetailsTrip(null);
      await refresh();
    } catch (e: any) {
      if (e?.status === 409) setError("Paid trips cannot be deleted.");
      else setError("Could not delete the trip.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xl font-semibold">Trips</div>
          <div className="text-sm text-slate-600">
            Trips by period. Showing {filteredTrips.length}/{trips.length}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="ghost"
            onClick={() => {
              setFilterWeek("");
              setFilterMonth("");
              setFilterFrom("");
              setFilterTo("");
              setFilterClientQuery("");
              setFilterCompanyId("");
              setFilterReceived("");
              setFilterCnfQuery("");
              setFilterFlightNumberQuery("");
              setFilterMeetGreet("");
            setFilterVehicleType("");
            }}
          >
            Clear filters
          </Button>
          <Button onClick={openCreate}>Add trip</Button>
        </div>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
          <Input
            label="Week"
            type="week"
            value={filterWeek}
            onChange={(e) => {
              setFilterWeek(e.target.value);
              if (e.target.value) setFilterMonth("");
            }}
          />
          <Input
            label="Month"
            type="month"
            value={filterMonth}
            onChange={(e) => {
              setFilterMonth(e.target.value);
              if (e.target.value) setFilterWeek("");
            }}
          />
          <label className="block md:col-span-2">
            <div className="mb-1 text-sm font-medium text-slate-700">Payment</div>
            <select
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 md:text-sm"
              value={filterReceived}
              onChange={(e) => setFilterReceived(e.target.value as any)}
            >
              <option value="">All</option>
              <option value="not_received">Unpaid</option>
              <option value="received">Paid</option>
            </select>
          </label>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-6">
          <DateFilterInput label="From (date)" value={filterFrom} onChange={setFilterFrom} />
          <DateFilterInput label="To (date)" value={filterTo} onChange={setFilterTo} />
          <div className="md:col-span-2">
            <Input
              label="Client"
              placeholder="Filter by client..."
              value={filterClientQuery}
              onChange={(e) => setFilterClientQuery(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <AutocompleteSelect
              label="Company"
              placeholder="Filter by company..."
              options={filterCompanyOptions}
              valueId={filterCompanyId}
              onChangeId={setFilterCompanyId}
            />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-8">
          <div className="md:col-span-2">
            <Input
              label="CNF"
              placeholder="Filter by CNF..."
              value={filterCnfQuery}
              onChange={(e) => setFilterCnfQuery(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Input
              label="Flight Number"
              placeholder="Filter by flight number..."
              value={filterFlightNumberQuery}
              onChange={(e) => setFilterFlightNumberQuery(e.target.value)}
            />
          </div>
          <label className="block md:col-span-2">
            <div className="mb-1 text-sm font-medium text-slate-700">Vehicle</div>
            <select
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 md:text-sm"
              value={filterVehicleType}
              onChange={(e) => setFilterVehicleType(e.target.value as any)}
            >
              <option value="">All</option>
              <option value="SUV">SUV</option>
              <option value="Sedan">Sedan</option>
              <option value="Economy">Economy</option>
            </select>
          </label>
          <label className="block md:col-span-2">
            <div className="mb-1 text-sm font-medium text-slate-700">Meet &amp; Greet</div>
            <select
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 md:text-sm"
              value={filterMeetGreet}
              onChange={(e) => setFilterMeetGreet(e.target.value as any)}
            >
              <option value="">All</option>
              <option value="yes">With</option>
              <option value="no">Without</option>
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="hidden grid-cols-12 gap-2 border-b border-slate-200 bg-slate-50 p-3 text-sm font-medium md:grid">
          <div className="col-span-2">Start</div>
          <div className="col-span-2">Driver</div>
          <div className="col-span-2">Client</div>
          <div className="col-span-4">Origin → Destination</div>
          <div className="col-span-2 text-right">Amount</div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredTrips.map((t) => (
            <div key={t.id} className="p-3">
              <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-12 md:items-center">
                <div className="md:col-span-2">
                  <div className="text-slate-600 md:hidden">Start</div>
                  <div className="font-medium">{formatDate(t.startAt)}</div>
                  <div className="text-xs text-slate-600">{formatTime(t.startAt)}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-slate-600 md:hidden">Driver</div>
                  <div>{driverById.get(t.driverId) || t.driverId}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-slate-600 md:hidden">Client</div>
                  <div>{t.clientId ? clientById.get(t.clientId) || t.clientId : "—"}</div>
                  <div className="text-xs text-slate-600">
                    Company: {companyById.get(t.companyId) || t.companyId}
                  </div>
                </div>
                <div className="md:col-span-4">
                  <div className="text-slate-600 md:hidden">Origin → Destination</div>
                  <div className="truncate">
                    {t.origin} → {t.destination}
                  </div>
                </div>
                <div className="md:col-span-2 md:text-right">
                  <div className="text-slate-600 md:hidden">Amount</div>
                  <div className="font-medium">$ {t.price.toFixed(2)}</div>
                  <div className="mt-1 flex flex-wrap items-center justify-start gap-2 md:justify-end">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                        t.received ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {t.received ? "Paid" : "Unpaid"}
                    </span>
                    <button
                      className="text-xs text-slate-700 underline hover:text-slate-900"
                      onClick={async () => {
                        try {
                          await api.tripSetReceived(t.id, !t.received);
                          await refresh();
                        } catch {
                          setError("Could not update payment status.");
                        }
                      }}
                    >
                      {t.received ? "Mark unpaid" : "Mark paid"}
                    </button>
                    <button
                      className="text-xs font-medium text-slate-900 underline hover:text-slate-700"
                      onClick={() => {
                        setDetailsTrip(t);
                        setDetailsOpen(true);
                      }}
                    >
                      Details
                    </button>
                    {!t.received ? (
                      <button
                        className="text-xs font-medium text-red-700 underline hover:text-red-600"
                        onClick={() => deleteTrip(t)}
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {loading ? <div className="p-3 text-sm text-slate-600">Loading...</div> : null}
          {!loading && filteredTrips.length === 0 ? <div className="p-3 text-sm text-slate-600">No trips for this filter.</div> : null}
        </div>
      </div>

      <Modal title={editingTrip ? "Edit trip" : "Add trip"} open={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="space-y-4">
          <label className="block">
            <div className="mb-1 text-sm font-medium text-slate-700">Driver</div>
            <select
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 md:text-sm"
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
            >
              {drivers.map((d: any) => (
                <option key={d.id} value={d.id} disabled={d.active === false}>
                  {d.name} {d.active === false ? "(inactive)" : ""}
                </option>
              ))}
            </select>
          </label>

          <AutocompleteSelect
            label="Cliente"
            placeholder="Buscar cliente..."
            options={clientOptions}
            valueId={clientId}
            onChangeId={(id) => {
              setClientId(id);
              const c = clients.find((x) => x.id === id);
              if (c?.phone) setClientPhone(String(c.phone));
            }}
          />
          <Input
            label="Telefone"
            type="tel"
            inputMode="tel"
            placeholder="(11) 99999-9999"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
          />
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-sm font-medium text-slate-700">Vehicle</div>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-800">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                  checked={vehicleType === "SUV"}
                  onChange={(e) => setVehicleType(e.target.checked ? "SUV" : "")}
                />
                SUV
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                  checked={vehicleType === "Sedan"}
                  onChange={(e) => setVehicleType(e.target.checked ? "Sedan" : "")}
                />
                Sedan
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                  checked={vehicleType === "Economy"}
                  onChange={(e) => setVehicleType(e.target.checked ? "Economy" : "")}
                />
                Economy
              </label>
            </div>
          </div>

          <AutocompleteSelect
            label="Partner company"
            placeholder="Type to search..."
            options={companyOptions}
            valueId={companyId}
            onChangeId={setCompanyId}
          />

          <div className="grid grid-cols-1 gap-3">
            <Input
              label="Trip date/time"
              type="datetime-local"
              value={startAt}
              onChange={(e) => {
                setStartAt(e.target.value);
                setEndAt(e.target.value);
              }}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Pickup" value={origin} onChange={(e) => setOrigin(e.target.value)} />
            <Input label="Dropoff" value={destination} onChange={(e) => setDestination(e.target.value)} />
          </div>

          <Input label="Stop" value={stop} onChange={(e) => setStop(e.target.value)} />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="CNF" value={cnf} onChange={(e) => setCnf(e.target.value)} />
            <Input label="Flight Number" value={flightNumber} onChange={(e) => setFlightNumber(e.target.value)} />
          </div>

          <Input
            label="Meet & Greet"
            placeholder="e.g., greeter name / instructions..."
            value={meetGreet}
            onChange={(e) => setMeetGreet(e.target.value)}
          />

          <div className="grid grid-cols-1 gap-3">
            <Input label="Amount ($)" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>

          <label className="block">
            <div className="mb-1 text-sm font-medium text-slate-700">Payment</div>
            <select
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 md:text-sm"
              value={received ? "received" : "not_received"}
              onChange={(e) => setReceived(e.target.value === "received")}
            >
              <option value="not_received">Unpaid</option>
              <option value="received">Paid</option>
            </select>
          </label>

          <label className="block">
            <div className="mb-1 text-sm font-medium text-slate-700">Notes</div>
            <textarea
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 md:text-sm"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </label>

          <div className="flex gap-2">
            <Button
              onClick={submit}
              disabled={saving || !driverId || !clientId || !companyId || !origin.trim() || !destination.trim()}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <Modal title="Trip details" open={detailsOpen} onClose={() => setDetailsOpen(false)}>
        {detailsTrip ? (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Detail label="Date" value={`${formatDate(detailsTrip.startAt)} ${formatTime(detailsTrip.startAt)}`} />
              <Detail label="Payment" value={detailsTrip.received ? "Paid" : "Unpaid"} />
              <Detail label="Driver" value={driverById.get(detailsTrip.driverId) || detailsTrip.driverId} />
              <Detail label="Client" value={detailsTrip.clientId ? clientById.get(detailsTrip.clientId) || detailsTrip.clientId : "—"} />
              <Detail label="Phone Number" value={detailsTrip.clientPhone ? String(detailsTrip.clientPhone) : "—"} />
              <Detail label="Company" value={companyById.get(detailsTrip.companyId) || detailsTrip.companyId} />
              <Detail label="Vehicle" value={detailsTrip.vehicleType ? String(detailsTrip.vehicleType) : "—"} />
              <Detail label="CNF" value={detailsTrip.cnf ? String(detailsTrip.cnf) : "—"} />
              <Detail label="Flight Number" value={detailsTrip.flightNumber ? String(detailsTrip.flightNumber) : "—"} />
              <Detail label="Meet & Greet" value={meetGreetLabel(detailsTrip.meetGreet)} />
              <Detail label="Pickup Address" value={detailsTrip.origin} />
              <Detail label="Dropoff Address" value={detailsTrip.destination} />
              <Detail label="Stop" value={detailsTrip.stop ? String(detailsTrip.stop) : "—"} />
              <Detail label="Amount" value={`$ ${detailsTrip.price.toFixed(2)}`} />
              <Detail label="Date/Time" value={`${formatDate(detailsTrip.startAt)} ${formatTime(detailsTrip.startAt)}`} />
            </div>
            {detailsTrip.notes ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-medium text-slate-700">Notes</div>
                <div className="mt-1 whitespace-pre-wrap text-slate-800">{detailsTrip.notes}</div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                onClick={() => exportTripPdf(detailsTrip, { driverById, clientById, companyById })}
              >
                Export PDF
              </button>
              <button
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                onClick={() => openEdit(detailsTrip)}
              >
                Edit trip
              </button>
              {!detailsTrip.received ? (
                <button
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                  onClick={() => deleteTrip(detailsTrip)}
                >
                  Delete trip
                </button>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  Paid trips cannot be deleted.
                </div>
              )}
              <button
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                onClick={() => setDetailsOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function hasMeetGreet(v: unknown) {
  return typeof v === "string" ? !!v.trim() : false;
}

function meetGreetLabel(v: unknown) {
  if (typeof v === "string" && v.trim()) return v.trim();
  return "—";
}

function exportTripPdf(
  trip: Trip,
  refs: { driverById: Map<string, string>; clientById: Map<string, string>; companyById: Map<string, string> },
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const left = 40;
  const right = 40;
  const maxWidth = pageWidth - left - right;

  const driver = refs.driverById.get(trip.driverId) || trip.driverId;
  const client = trip.clientId ? refs.clientById.get(trip.clientId) || trip.clientId : "—";
  const company = refs.companyById.get(trip.companyId) || trip.companyId;
  const vehicle = trip.vehicleType ? String(trip.vehicleType) : "—";
  const meetGreet = meetGreetLabel(trip.meetGreet);
  const phone = trip.clientPhone ? String(trip.clientPhone) : "—";
  const route = `${trip.origin} -> ${trip.destination}`;
  const status = trip.received ? "Paid" : "Unpaid";

  doc.setFontSize(14);
  doc.text("Trip Details", left, 44);
  doc.setFontSize(10);
  doc.text(`ID: ${trip.id}`, left, 62);

  let y = 88;
  const line = (label: string, value: string) => {
    doc.setFontSize(10);
    doc.text(`${label}:`, left, y);
    doc.setFontSize(10);
    const xVal = left + 110;
    const wrapped = doc.splitTextToSize(value || "—", maxWidth - 110);
    doc.text(wrapped, xVal, y);
    y += 16 + (wrapped.length - 1) * 12;
  };

  line("Date/Time", `${formatDate(trip.startAt)} ${formatTime(trip.startAt)}`);
  line("Payment", status);
  line("Driver", driver);
  line("Client", client);
  line("Phone number", phone);
  line("Company", company);
  line("Vehicle", vehicle);
  line("CNF", trip.cnf ? String(trip.cnf) : "—");
  line("Flight Number", trip.flightNumber ? String(trip.flightNumber) : "—");
  line("Meet & Greet", meetGreet);
  line("Route", route);
  if (trip.stop) line("Stop", trip.stop);
  line("Amount", `$ ${trip.price.toFixed(2)}`);

  if (trip.notes && trip.notes.trim()) {
    y += 8;
    doc.setFontSize(10);
    doc.text("Notes:", left, y);
    y += 14;
    const wrapped = doc.splitTextToSize(trip.notes.trim(), maxWidth);
    doc.text(wrapped, left, y);
    y += wrapped.length * 12;
  }

  const fileSafeDate = new Date(trip.startAt).toISOString().slice(0, 10);
  doc.save(`trip_${fileSafeDate}_${trip.id}.pdf`);
}

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-US");
  } catch {
    return iso;
  }
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US");
  } catch {
    return iso;
  }
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("en-US");
  } catch {
    return "";
  }
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-xs font-medium text-slate-600">{label}</div>
      <div className="min-w-0 truncate text-slate-900">{value}</div>
    </div>
  );
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatUsDateOnly(d: Date) {
  return `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}/${d.getFullYear()}`;
}

function isoWeekToRange(weekValue: string): { from: Date; to: Date } | null {
  // input type="week" -> "YYYY-Www"
  const m = /^(\d{4})-W(\d{2})$/.exec(weekValue);
  if (!m) return null;
  const year = Number(m[1]);
  const week = Number(m[2]);
  if (!Number.isFinite(year) || !Number.isFinite(week) || week < 1 || week > 53) return null;
  // ISO week: week 1 contains Jan 4; weeks start on Monday
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7; // 1..7 (Mon..Sun)
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setDate(jan4.getDate() - (jan4Day - 1));
  mondayWeek1.setHours(0, 0, 0, 0);
  const from = new Date(mondayWeek1);
  from.setDate(mondayWeek1.getDate() + (week - 1) * 7);
  const to = new Date(from);
  to.setDate(from.getDate() + 6);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

function isoMonthToRange(monthValue: string): { from: Date; to: Date } | null {
  // input type="month" -> "YYYY-MM"
  const m = /^(\d{4})-(\d{2})$/.exec(monthValue);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  const from = new Date(year, month - 1, 1);
  from.setHours(0, 0, 0, 0);
  // day 0 of next month = last day of current month
  const to = new Date(year, month, 0);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

function toLocalInputValue(d: Date) {
  // yyyy-MM-ddTHH:mm
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function fromLocalInputValue(v: string) {
  // interpret as local time; server stores as ISO
  const d = new Date(v);
  return d.toISOString();
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function parseUsDateOnly(mmDdYyyy: string): Date | null {
  // expects MM/DD/YYYY, returns local date at midnight
  const s = mmDdYyyy.trim();
  if (!s) return null;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  const year = Number(m[3]);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  const d = new Date(year, month - 1, day);
  // validate overflow (e.g. 02/31/2025)
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d;
}


