import React, { useEffect, useMemo, useState } from "react";
import { BarList } from "../components/BarList";
import { DateFilterInput } from "../components/DateFilterInput";
import { Input } from "../components/Input";
import { api } from "../lib/api";

type Trip = {
  id: string;
  driverId: string;
  startAt: string;
  price: number;
  driverValue?: number | null;
  received: boolean;
};

export function DriverPayoutsDashboardPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [drivers, setDrivers] = useState<Array<{ id: string; name: string; active: boolean }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [filterWeek, setFilterWeek] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterDriverId, setFilterDriverId] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([api.tripsList(), api.driversList()])
      .then(([t, d]) => {
        if (!alive) return;
        setTrips(t);
        setDrivers(d);
      })
      .catch(() => {
        if (alive) setError("Could not load driver payouts.");
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
  const driverOptions = useMemo(
    () => [{ id: "", label: "All drivers" }, ...drivers.map((d) => ({ id: d.id, label: d.name, disabled: !d.active }))],
    [drivers],
  );

  const filteredTrips = useMemo(() => {
    const from = parseUsDateOnly(filterFrom);
    const to = parseUsDateOnly(filterTo);
    const fromBound = from ? startOfDay(from) : null;
    const toBound = to ? endOfDay(to) : null;
    return trips.filter((t) => {
      const dt = new Date(t.startAt);
      if (fromBound && dt < fromBound) return false;
      if (toBound && dt > toBound) return false;
      if (filterDriverId && t.driverId !== filterDriverId) return false;
      return true;
    });
  }, [trips, filterFrom, filterTo, filterDriverId]);

  const driverPayouts = useMemo(() => {
    const byDriver = new Map<string, { name: string; tripCount: number; totalPayout: number }>();
    for (const t of filteredTrips) {
      const payout = t.driverValue != null ? Number(t.driverValue) : t.price;
      const name = driverById.get(t.driverId) || t.driverId;
      if (!byDriver.has(t.driverId)) {
        byDriver.set(t.driverId, { name, tripCount: 0, totalPayout: 0 });
      }
      const row = byDriver.get(t.driverId)!;
      row.tripCount += 1;
      row.totalPayout += payout;
    }
    return Array.from(byDriver.entries())
      .map(([driverId, data]) => ({ driverId, ...data }))
      .sort((a, b) => b.totalPayout - a.totalPayout);
  }, [filteredTrips, driverById]);

  const summary = useMemo(() => {
    let totalPayout = 0;
    for (const t of filteredTrips) {
      totalPayout += t.driverValue != null ? Number(t.driverValue) : t.price;
    }
    return {
      totalTrips: filteredTrips.length,
      totalPayout,
    };
  }, [filteredTrips]);

  const barItems = useMemo(
    () =>
      driverPayouts.map((d) => ({
        label: d.name,
        value: d.totalPayout,
        href: "#",
      })),
    [driverPayouts],
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xl font-semibold">Driver Payouts Dashboard</div>
        <div className="text-sm text-slate-600">Payouts made to drivers by period</div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : null}

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
          <DateFilterInput label="From (date)" value={filterFrom} onChange={setFilterFrom} />
          <DateFilterInput label="To (date)" value={filterTo} onChange={setFilterTo} />
          <label className="block">
            <div className="mb-1 text-sm font-medium text-slate-700">Driver</div>
            <select
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 md:text-sm"
              value={filterDriverId}
              onChange={(e) => setFilterDriverId(e.target.value)}
            >
              {driverOptions.map((o) => (
                <option key={o.id} value={o.id} disabled={o.disabled}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <div className="p-4 text-sm text-slate-600">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-medium text-slate-600">Total trips</div>
              <div className="text-2xl font-semibold text-slate-900">{summary.totalTrips}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-medium text-slate-600">Total driver payouts</div>
              <div className="text-2xl font-semibold text-slate-900">$ {summary.totalPayout.toFixed(2)}</div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 text-sm font-semibold text-slate-900">Payouts by driver</div>
            {driverPayouts.length > 0 ? (
              <BarList items={barItems} />
            ) : (
              <div className="text-sm text-slate-600">No payouts for this filter.</div>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 bg-slate-50 p-3 text-sm font-medium">Driver breakdown</div>
            <div className="divide-y divide-slate-100">
              {driverPayouts.map((d) => (
                <div key={d.driverId} className="flex items-center justify-between p-3 text-sm">
                  <div>
                    <div className="font-medium text-slate-900">{d.name}</div>
                    <div className="text-xs text-slate-600">{d.tripCount} trip(s)</div>
                  </div>
                  <div className="font-medium text-slate-900">$ {d.totalPayout.toFixed(2)}</div>
                </div>
              ))}
              {!loading && driverPayouts.length === 0 ? (
                <div className="p-3 text-sm text-slate-600">No drivers with payouts for this filter.</div>
              ) : null}
            </div>
          </div>
        </>
      )}
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
  const m = /^(\d{4})-W(\d{2})$/.exec(weekValue);
  if (!m) return null;
  const year = Number(m[1]);
  const week = Number(m[2]);
  if (!Number.isFinite(year) || !Number.isFinite(week) || week < 1 || week > 53) return null;
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7;
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
  const m = /^(\d{4})-(\d{2})$/.exec(monthValue);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  const from = new Date(year, month - 1, 1);
  from.setHours(0, 0, 0, 0);
  const to = new Date(year, month, 0);
  to.setHours(23, 59, 59, 999);
  return { from, to };
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
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d;
}
