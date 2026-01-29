import React, { useEffect, useMemo, useState } from "react";
import { AutocompleteSelect } from "../components/AutocompleteSelect";
import { Button } from "../components/Button";
import { DateFilterInput } from "../components/DateFilterInput";
import { Input } from "../components/Input";
import { api } from "../lib/api";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

type Trip = {
  id: string;
  driverId: string;
  clientId: string | null;
  companyId: string;
  startAt: string;
  origin: string;
  destination: string;
  price: number;
  driverValue?: number | null;
  received: boolean;
};

export function DriverClosingReportPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [drivers, setDrivers] = useState<Array<{ id: string; name: string; active: boolean }>>([]);
  const [clients, setClients] = useState<Array<{ id: string; name: string; active: boolean }>>([]);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string; active: boolean }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [filterWeek, setFilterWeek] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterClientQuery, setFilterClientQuery] = useState("");
  const [filterReceived, setFilterReceived] = useState<"" | "received" | "not_received">("");
  const [filterDriverId, setFilterDriverId] = useState("");
  const [filterCompanyId, setFilterCompanyId] = useState("");

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
        if (alive) setError("Could not load driver closing report.");
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
  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);
  const companyById = useMemo(() => new Map(companies.map((c) => [c.id, c.name])), [companies]);
  const companyOptions = useMemo(
    () => [{ id: "", label: "All companies" }, ...companies.map((c) => ({ id: c.id, label: c.name, disabled: !c.active }))],
    [companies],
  );
  const driverOptions = useMemo(
    () => [{ id: "", label: "All drivers" }, ...drivers.map((d) => ({ id: d.id, label: d.name, disabled: !d.active }))],
    [drivers],
  );

  const filteredTrips = useMemo(() => {
    const from = parseUsDateOnly(filterFrom);
    const to = parseUsDateOnly(filterTo);
    const fromBound = from ? startOfDay(from) : null;
    const toBound = to ? endOfDay(to) : null;
    const qClient = filterClientQuery.trim().toLowerCase();
    return trips.filter((t) => {
      const dt = new Date(t.startAt);
      if (fromBound && dt < fromBound) return false;
      if (toBound && dt > toBound) return false;
      if (qClient) {
        const clientLabel = (t.clientId ? clientById.get(t.clientId) : "")?.toLowerCase?.() || "";
        if (!clientLabel.includes(qClient)) return false;
      }
      if (filterDriverId && t.driverId !== filterDriverId) return false;
      if (filterCompanyId && t.companyId !== filterCompanyId) return false;
      if (filterReceived === "received" && !t.received) return false;
      if (filterReceived === "not_received" && t.received) return false;
      return true;
    });
  }, [
    trips,
    filterFrom,
    filterTo,
    filterClientQuery,
    filterDriverId,
    filterCompanyId,
    filterReceived,
    clientById,
  ]);

  const reportRows = useMemo(() => {
    return filteredTrips
      .slice()
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .map((t) => {
        const driverValue = t.driverValue != null ? Number(t.driverValue) : t.price;
        return {
          id: t.id,
          date: formatDate(t.startAt),
          time: formatTime(t.startAt),
          driver: driverById.get(t.driverId) || t.driverId,
          client: t.clientId ? clientById.get(t.clientId) || t.clientId : "—",
          company: companyById.get(t.companyId) || t.companyId,
          route: `${t.origin} → ${t.destination}`,
          received: t.received ? "Paid" : "Unpaid",
          value: driverValue,
        };
      });
  }, [filteredTrips, driverById, clientById, companyById]);

  function exportPdf() {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const title = "Driver Closing Report";

    const clientLabel = filterClientQuery.trim() ? filterClientQuery.trim() : "All";
    const companyLabel = filterCompanyId ? companyById.get(filterCompanyId) || filterCompanyId : "All";
    const driverLabel = filterDriverId ? driverById.get(filterDriverId) || filterDriverId : "All";
    const receivedLabel =
      filterReceived === "received" ? "Paid" : filterReceived === "not_received" ? "Unpaid" : "All";
    const periodLabel = filterWeek
      ? weekLabel(filterWeek, filterFrom, filterTo)
      : filterMonth
        ? monthLabel(filterMonth, filterFrom, filterTo)
      : filterFrom || filterTo
        ? `${filterFrom || "—"} to ${filterTo || "—"}`
        : "All";

    doc.setFontSize(14);
    doc.text(title, 40, 40);
    doc.setFontSize(10);
    doc.text(
      `Period: ${periodLabel} | Client: ${clientLabel} | Driver: ${driverLabel} | Company: ${companyLabel} | Payment: ${receivedLabel}`,
      40,
      60,
    );

    const head = [[
      "Date",
      "Time",
      "Driver",
      "Client",
      "Company",
      "Origin -> Destination",
      "Paid",
      "Driver amount ($)",
    ]];

    const body = reportRows.map((r) => [
      r.date,
      r.time,
      r.driver,
      r.client,
      r.company,
      r.route.replace("→", "->"),
      r.received,
      r.value.toFixed(2),
    ]);

    const totalValue = reportRows.reduce((acc, r) => acc + r.value, 0);
    const totalReceived = reportRows.filter((r) => r.received === "Paid").reduce((acc, r) => acc + r.value, 0);
    const totalNotReceived = totalValue - totalReceived;

    autoTable(doc, {
      head,
      body,
      startY: 80,
      margin: { left: 40, right: 40 },
      styles: { fontSize: 8.5, cellPadding: 4, overflow: "linebreak" },
      headStyles: { fillColor: [15, 23, 42] },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 40 },
        2: { cellWidth: 95 },
        3: { cellWidth: 95 },
        4: { cellWidth: 105 },
        5: { cellWidth: 210 },
        6: { cellWidth: 65 },
        7: { halign: "right", cellWidth: 55 },
      },
      didDrawPage: (data) => {
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(9);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          doc.internal.pageSize.getWidth() - 90,
          doc.internal.pageSize.getHeight() - 20,
        );
      },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 80;
    doc.setFontSize(10);
    doc.text(
      `Total: $ ${totalValue.toFixed(2)} | Paid: $ ${totalReceived.toFixed(2)} | Unpaid: $ ${totalNotReceived.toFixed(2)}`,
      40,
      finalY + 24,
    );

    const fileName = `driver_closing_report_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xl font-semibold">Driver Closing Report</div>
        <div className="text-sm text-slate-600">
          Report by trip using driver value (amount paid to driver). Showing {filteredTrips.length}/{trips.length}
        </div>
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
            <div className="mb-1 text-sm font-medium text-slate-700">Payment</div>
            <select
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 md:text-sm"
              value={filterReceived}
              onChange={(e) => setFilterReceived(e.target.value as "" | "received" | "not_received")}
            >
              <option value="">All</option>
              <option value="not_received">Unpaid</option>
              <option value="received">Paid</option>
            </select>
          </label>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-6">
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
              options={companyOptions}
              valueId={filterCompanyId}
              onChangeId={setFilterCompanyId}
            />
          </div>
          <div className="md:col-span-2">
            <AutocompleteSelect
              label="Driver"
              placeholder="Filter by driver..."
              options={driverOptions}
              valueId={filterDriverId}
              onChangeId={setFilterDriverId}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-600">
          Rows: <span className="font-medium text-slate-900">{reportRows.length}</span>
        </div>
        <Button onClick={exportPdf} disabled={reportRows.length === 0}>
          Export PDF
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="hidden grid-cols-12 gap-2 border-b border-slate-200 bg-slate-50 p-3 text-sm font-medium md:grid">
          <div className="col-span-2">Date/Time</div>
          <div className="col-span-2">Driver</div>
          <div className="col-span-2">Client</div>
          <div className="col-span-2">Company</div>
          <div className="col-span-2">Origin → Destination</div>
          <div className="col-span-1">Paid</div>
          <div className="col-span-1 text-right">Driver amount</div>
        </div>
        <div className="divide-y divide-slate-100">
          {reportRows.map((r) => (
            <div key={r.id} className="p-3">
              <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-12 md:items-center">
                <div className="md:col-span-2">
                  <div className="text-slate-600 md:hidden">Date/Time</div>
                  <div className="font-medium">{r.date}</div>
                  <div className="text-xs text-slate-600">{r.time}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-slate-600 md:hidden">Driver</div>
                  <div className="truncate">{r.driver}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-slate-600 md:hidden">Client</div>
                  <div className="truncate">{r.client}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-slate-600 md:hidden">Company</div>
                  <div className="truncate">{r.company}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-slate-600 md:hidden">Origin → Destination</div>
                  <div className="truncate">{r.route}</div>
                </div>
                <div className="md:col-span-1">
                  <div className="text-slate-600 md:hidden">Paid</div>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                      r.received === "Paid"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {r.received}
                  </span>
                </div>
                <div className="md:col-span-1 md:text-right">
                  <div className="text-slate-600 md:hidden">Driver amount</div>
                  <div className="font-medium">$ {r.value.toFixed(2)}</div>
                </div>
              </div>
            </div>
          ))}
          {loading ? <div className="p-3 text-sm text-slate-600">Loading...</div> : null}
          {!loading && reportRows.length === 0 ? (
            <div className="p-3 text-sm text-slate-600">No trips for this filter.</div>
          ) : null}
        </div>
      </div>
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
function weekLabel(weekValue: string, fromMmDdYyyy: string, toMmDdYyyy: string) {
  return `${weekValue} (${fromMmDdYyyy || "—"} to ${toMmDdYyyy || "—"})`;
}
function monthLabel(monthValue: string, fromMmDdYyyy: string, toMmDdYyyy: string) {
  return `${monthValue} (${fromMmDdYyyy || "—"} to ${toMmDdYyyy || "—"})`;
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
function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString("en-US");
  } catch {
    return value;
  }
}
function formatTime(value: string) {
  try {
    return new Date(value).toLocaleTimeString("en-US");
  } catch {
    return "";
  }
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
