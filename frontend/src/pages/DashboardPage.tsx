import React, { useEffect, useMemo, useState } from "react";
import { AutocompleteSelect } from "../components/AutocompleteSelect";
import { BarList } from "../components/BarList";
import { Button } from "../components/Button";
import { DateFilterInput } from "../components/DateFilterInput";
import { Input } from "../components/Input";
import { api } from "../lib/api";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export function DashboardPage() {
  const [trips, setTrips] = useState<
    Array<{
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
  >([]);
  const [drivers, setDrivers] = useState<Array<{ id: string; name: string; active: boolean }>>([]);
  const [clients, setClients] = useState<Array<{ id: string; name: string; active: boolean }>>([]);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string; active: boolean }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState<"summary" | "hourly-analysis" | "report-trips" | "report-cnf" | "report-company">("summary");
<<<<<<< HEAD
  const [expandedCnfDays, setExpandedCnfDays] = useState<Set<string>>(new Set());
  const [expandedCompanyDays, setExpandedCompanyDays] = useState<Set<string>>(new Set());
=======
>>>>>>> f71f286904dbb73ecf1661dd8745672e73d919fe

  // filters
  const [filterWeek, setFilterWeek] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterClientQuery, setFilterClientQuery] = useState("");
  const [filterReceived, setFilterReceived] = useState<"" | "received" | "not_received">("");
  const [filterDriverId, setFilterDriverId] = useState("");
  const [filterCompanyId, setFilterCompanyId] = useState("");
  const [filterCnfQuery, setFilterCnfQuery] = useState("");
  const [filterFlightNumberQuery, setFilterFlightNumberQuery] = useState("");
  const [filterMeetGreet, setFilterMeetGreet] = useState<"" | "yes" | "no">("");
  const [filterVehicleType, setFilterVehicleType] = useState<"" | "SUV" | "Sedan" | "Economy" | "First Class">("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([api.tripsList(), api.clientsList(), api.companiesList(), api.driversList()])
      .then(([t, c, co, d]) => {
        if (!alive) return;
        setTrips(t);
        setClients(c);
        setCompanies(co);
        setDrivers(d);
      })
      .catch(() => {
        if (alive) setError("Could not load the dashboard.");
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
      if (filterDriverId && t.driverId !== filterDriverId) return false;
      if (filterCompanyId && t.companyId !== filterCompanyId) return false;
      if (filterVehicleType && (t.vehicleType || "") !== filterVehicleType) return false;
      if (filterReceived === "received" && !t.received) return false;
      if (filterReceived === "not_received" && t.received) return false;
      const hasMg = typeof t.meetGreet === "string" ? !!t.meetGreet.trim() : false;
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
    filterDriverId,
    filterCompanyId,
    filterReceived,
    clientById,
  ]);

  const reportRows = useMemo(() => {
    return filteredTrips
      .slice()
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .map((t) => ({
        id: t.id,
        date: formatDate(t.startAt),
        time: formatTime(t.startAt),
        driver: driverById.get(t.driverId) || t.driverId,
        client: t.clientId ? clientById.get(t.clientId) || t.clientId : "—",
        company: companyById.get(t.companyId) || t.companyId,
        route: `${t.origin} → ${t.destination}`,
        received: t.received ? "Paid" : "Unpaid",
        value: t.price,
      }));
  }, [filteredTrips, driverById, clientById, companyById]);

  const cnfReportRows = useMemo(() => {
    const tripsWithCnf = filteredTrips
      .filter((t) => typeof t.cnf === "string" && t.cnf.trim())
      .map((t) => ({
        id: t.id,
        date: formatDate(t.startAt),
        time: formatTime(t.startAt),
        cnf: t.cnf ? String(t.cnf) : "",
        driver: driverById.get(t.driverId) || t.driverId,
        client: t.clientId ? clientById.get(t.clientId) || t.clientId : "—",
        company: companyById.get(t.companyId) || t.companyId,
        received: t.received ? "Paid" : "Unpaid",
        value: t.price,
        startAt: t.startAt,
      }));

    const groupedByDate = new Map<string, typeof tripsWithCnf>();
    for (const trip of tripsWithCnf) {
      const existing = groupedByDate.get(trip.date);
      if (existing) {
        existing.push(trip);
      } else {
        groupedByDate.set(trip.date, [trip]);
      }
    }

    return Array.from(groupedByDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, trips]) => ({
        date,
        count: trips.length,
        totalRevenue: trips.reduce((sum, t) => sum + t.value, 0),
        trips: trips.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
      }));
  }, [filteredTrips, driverById, clientById, companyById]);

  function exportPdf() {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const title = "Trips Report";

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

    // NOTE: keep ASCII-friendly headers to avoid font encoding issues in jsPDF default fonts
    const head = [[
      "Date",
      "Time",
      "Driver",
      "Client",
      "Company",
      "Origin -> Destination",
      "Paid",
      "Amount ($)",
    ]];

    const body = reportRows.map((r) => [
      r.date,
      r.time,
      r.driver,
      r.client,
      r.company,
      // avoid special arrow character that may render incorrectly in built-in fonts
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
      headStyles: { fillColor: [15, 23, 42] }, // slate-900
      columnStyles: {
        // widths tuned to fit A4 landscape with 40pt margins (prevents last column cutoff)
        0: { cellWidth: 55 }, // Date
        1: { cellWidth: 40 }, // Time
        2: { cellWidth: 95 }, // Driver
        3: { cellWidth: 95 }, // Client
        4: { cellWidth: 105 }, // Company
        5: { cellWidth: 210 }, // Origin -> Destination
        6: { cellWidth: 65 }, // Paid
        7: { halign: "right", cellWidth: 55 }, // Amount
      },
      didDrawPage: (data) => {
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(9);
        doc.text(`Page ${data.pageNumber} of ${pageCount}`, doc.internal.pageSize.getWidth() - 90, doc.internal.pageSize.getHeight() - 20);
      },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 80;
    doc.setFontSize(10);
    doc.text(`Total: $ ${totalValue.toFixed(2)} | Paid: $ ${totalReceived.toFixed(2)} | Unpaid: $ ${totalNotReceived.toFixed(2)}`, 40, finalY + 24);

    const fileName = `trips_report_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
  }

  function exportCnfPdf() {
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const title = "Report 2 - CNF by Day";

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
    doc.setFontSize(9.5);
    doc.text(
      `Period: ${periodLabel} | Client: ${clientLabel} | Driver: ${driverLabel} | Company: ${companyLabel} | Payment: ${receivedLabel}`,
      40,
      60,
    );

    const head = [["Date", "Time", "CNF", "Driver", "Client", "Company", "Paid", "Amount ($)"]];
    const body: string[][] = [];
    for (const dayGroup of cnfReportRows) {
      for (const trip of dayGroup.trips) {
        body.push([
          trip.date,
          trip.time,
          trip.cnf,
          trip.driver,
          trip.client,
          trip.company,
          trip.received,
          trip.value.toFixed(2),
        ]);
      }
    }

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
        2: { cellWidth: 80 },
        3: { cellWidth: 85 },
        4: { cellWidth: 85 },
        5: { cellWidth: 95 },
        6: { cellWidth: 55 },
        7: { halign: "right", cellWidth: 55 },
      },
      didDrawPage: (data) => {
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(9);
        doc.text(`Page ${data.pageNumber} of ${pageCount}`, doc.internal.pageSize.getWidth() - 90, doc.internal.pageSize.getHeight() - 20);
      },
    });

    const totalValue = cnfReportRows.reduce((acc, r) => acc + r.totalRevenue, 0);
    const finalY = (doc as any).lastAutoTable?.finalY || 80;
    doc.setFontSize(10);
    doc.text(`Total: $ ${totalValue.toFixed(2)}`, 40, finalY + 24);

    const fileName = `cnf_report_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
  }

  function exportCompanyPdf() {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const title = "Report - Company";

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

    const head = [["Date", "Time", "CNF", "Driver", "Client", "Company", "Paid", "Amount ($)"]];
    const body: string[][] = [];
    for (const dayGroup of companyReportRows) {
      for (const trip of dayGroup.trips) {
        body.push([
          trip.date,
          trip.time,
          trip.cnf,
          trip.driver,
          trip.client,
          trip.company,
          trip.received,
          trip.value.toFixed(2),
        ]);
      }
    }

    autoTable(doc, {
      head,
      body,
      startY: 80,
      margin: { left: 40, right: 40 },
      styles: { fontSize: 9, cellPadding: 4, overflow: "linebreak" },
      headStyles: { fillColor: [15, 23, 42] },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 40 },
        2: { cellWidth: 80 },
        3: { cellWidth: 85 },
        4: { cellWidth: 85 },
        5: { cellWidth: 95 },
        6: { cellWidth: 55 },
        7: { halign: "right", cellWidth: 55 },
      },
      didDrawPage: (data) => {
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(9);
        doc.text(`Page ${data.pageNumber} of ${pageCount}`, doc.internal.pageSize.getWidth() - 90, doc.internal.pageSize.getHeight() - 20);
      },
    });

    const totalTrips = companyReportRows.reduce((acc, r) => acc + r.count, 0);
    const totalRevenue = companyReportRows.reduce((acc, r) => acc + r.totalRevenue, 0);
    const finalY = (doc as any).lastAutoTable?.finalY || 80;
    doc.setFontSize(10);
    doc.text(`Total Trips: ${totalTrips} | Total Revenue: $ ${totalRevenue.toFixed(2)}`, 40, finalY + 24);

    const fileName = `company_report_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
  }

  const summary = useMemo(() => {
    const totalTrips = filteredTrips.length;
    const totalRevenue = filteredTrips.reduce((acc, t) => acc + t.price, 0);
    const receivedTrips = filteredTrips.filter((t) => t.received);
    const notReceivedTrips = filteredTrips.filter((t) => !t.received);
    const receivedCount = receivedTrips.length;
    const notReceivedCount = notReceivedTrips.length;
    const receivedRevenue = receivedTrips.reduce((acc, t) => acc + t.price, 0);
    const notReceivedRevenue = notReceivedTrips.reduce((acc, t) => acc + t.price, 0);
    return {
      totalTrips,
      totalRevenue,
      receivedCount,
      notReceivedCount,
      receivedRevenue,
      notReceivedRevenue,
    };
  }, [filteredTrips]);

  const hourlyBreakdown = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      count: 0,
      revenue: 0,
    }));
    for (const t of filteredTrips) {
      const h = new Date(t.startAt).getHours();
      if (Number.isFinite(h) && h >= 0 && h < 24) {
        hours[h].count += 1;
        hours[h].revenue += t.price;
      }
    }
    return hours.map((h) => ({
      label: `${String(h.hour).padStart(2, "0")}:00`,
      value: h.count,
      valueLabel: `${h.count} • $ ${h.revenue.toFixed(2)}`,
    }));
  }, [filteredTrips]);

  const hourlyAnalysis = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      count: 0,
      revenue: 0,
      receivedRevenue: 0,
      notReceivedRevenue: 0,
      receivedCount: 0,
      notReceivedCount: 0,
    }));
    for (const t of filteredTrips) {
      const h = new Date(t.startAt).getHours();
      if (Number.isFinite(h) && h >= 0 && h < 24) {
        hours[h].count += 1;
        hours[h].revenue += t.price;
        if (t.received) {
          hours[h].receivedCount += 1;
          hours[h].receivedRevenue += t.price;
        } else {
          hours[h].notReceivedCount += 1;
          hours[h].notReceivedRevenue += t.price;
        }
      }
    }
    return hours.filter((h) => h.count > 0).map((h) => ({
      hour: h.hour,
      label: `${String(h.hour).padStart(2, "0")}:00`,
      count: h.count,
      revenue: h.revenue,
      receivedCount: h.receivedCount,
      receivedRevenue: h.receivedRevenue,
      notReceivedCount: h.notReceivedCount,
      notReceivedRevenue: h.notReceivedRevenue,
    }));
  }, [filteredTrips]);

  const companyReportRows = useMemo(() => {
    const tripsWithCnf = filteredTrips
      .filter((t) => typeof t.cnf === "string" && t.cnf.trim())
      .map((t) => ({
        id: t.id,
        date: formatDate(t.startAt),
        time: formatTime(t.startAt),
        cnf: t.cnf ? String(t.cnf) : "",
        driver: driverById.get(t.driverId) || t.driverId,
        client: t.clientId ? clientById.get(t.clientId) || t.clientId : "—",
        company: companyById.get(t.companyId) || t.companyId,
        received: t.received ? "Paid" : "Unpaid",
        value: t.price,
        startAt: t.startAt,
      }));

    const groupedByDate = new Map<string, typeof tripsWithCnf>();
    for (const trip of tripsWithCnf) {
      const existing = groupedByDate.get(trip.date);
      if (existing) {
        existing.push(trip);
      } else {
        groupedByDate.set(trip.date, [trip]);
      }
    }

    return Array.from(groupedByDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, trips]) => ({
        date,
        count: trips.length,
        totalRevenue: trips.reduce((sum, t) => sum + t.value, 0),
        trips: trips.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
      }));
  }, [filteredTrips, driverById, clientById, companyById]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xl font-semibold">Dashboard</div>
          <div className="text-sm text-slate-600">
            Filters by period, client, and company. Showing {filteredTrips.length}/{trips.length} trips.
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={page === "summary" ? "primary" : "ghost"} onClick={() => setPage("summary")}>
            Summary
          </Button>
          <Button variant={page === "hourly-analysis" ? "primary" : "ghost"} onClick={() => setPage("hourly-analysis")}>
            Hourly Analysis
          </Button>
          <Button variant={page === "report-trips" ? "primary" : "ghost"} onClick={() => setPage("report-trips")}>
            Trips Report
          </Button>
          <Button variant={page === "report-cnf" ? "primary" : "ghost"} onClick={() => setPage("report-cnf")}>
            CNF Report
          </Button>
          <Button variant={page === "report-company" ? "primary" : "ghost"} onClick={() => setPage("report-company")}>
            Company Report
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setFilterWeek("");
              setFilterMonth("");
              setFilterFrom("");
              setFilterTo("");
              setFilterClientQuery("");
              setFilterDriverId("");
              setFilterReceived("");
              setFilterCompanyId("");
              setFilterCnfQuery("");
              setFilterFlightNumberQuery("");
              setFilterMeetGreet("");
              setFilterVehicleType("");
            }}
          >
            Clear filters
          </Button>
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
          <DateFilterInput
            label="From (date)"
            value={filterFrom}
            onChange={(v) => {
              setFilterFrom(v);
              if (v) {
                setFilterWeek("");
                setFilterMonth("");
              }
            }}
          />
          <DateFilterInput
            label="To (date)"
            value={filterTo}
            onChange={(v) => {
              setFilterTo(v);
              if (v) {
                setFilterWeek("");
                setFilterMonth("");
              }
            }}
          />
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
              label="Driver"
              placeholder="Filter by driver..."
              options={driverOptions}
              valueId={filterDriverId}
              onChangeId={setFilterDriverId}
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
              <option value="First Class">First Class</option>
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

      {loading ? <div className="text-sm text-slate-600">Loading...</div> : null}

      {page === "summary" ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card title="Trips" value={String(summary.totalTrips)} />
            <Card title="Revenue" value={`$ ${summary.totalRevenue.toFixed(2)}`} />
            <Card title="Paid" value={`${summary.receivedCount} • $ ${summary.receivedRevenue.toFixed(2)}`} />
            <Card title="Unpaid" value={`${summary.notReceivedCount} • $ ${summary.notReceivedRevenue.toFixed(2)}`} />
          </div>
<<<<<<< HEAD
=======
          <div className="grid grid-cols-1 gap-3">
            <BarList title="Trips by Hour" items={hourlyBreakdown} />
          </div>
>>>>>>> f71f286904dbb73ecf1661dd8745672e73d919fe
        </div>
      ) : null}

      {page === "hourly-analysis" ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-semibold">Hourly Analysis Dashboard</div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[600px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-3 py-2 text-left font-medium text-slate-700">Hour</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-700">Trips</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-700">Revenue</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-700">Paid</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-700">Paid Revenue</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-700">Unpaid</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-700">Unpaid Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hourlyAnalysis.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-4 text-center text-slate-600">
                          No data.
                        </td>
                      </tr>
                    ) : (
                      hourlyAnalysis.map((h) => (
                        <tr key={h.hour} className="border-b border-slate-100">
                          <td className="px-3 py-2 font-medium text-slate-800">{h.label}</td>
                          <td className="px-3 py-2 text-right text-slate-700">{h.count}</td>
                          <td className="px-3 py-2 text-right font-medium text-slate-800">$ {h.revenue.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-slate-700">{h.receivedCount}</td>
                          <td className="px-3 py-2 text-right text-slate-700">$ {h.receivedRevenue.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-slate-700">{h.notReceivedCount}</td>
                          <td className="px-3 py-2 text-right text-slate-700">$ {h.notReceivedRevenue.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {page === "report-trips" ? (
        <div className="space-y-3">
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
              <div className="col-span-1 text-right">Amount</div>
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
                      <div className="text-slate-600 md:hidden">Amount</div>
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
      ) : null}

      {page === "report-cnf" ? (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">Report 2 - CNF by Day</div>
              <div className="text-sm text-slate-600">
<<<<<<< HEAD
                Days: <span className="font-medium text-slate-900">{cnfReportRows.length}</span>
=======
                Rows: <span className="font-medium text-slate-900">{cnfReportRows.length}</span>
>>>>>>> f71f286904dbb73ecf1661dd8745672e73d919fe
              </div>
            </div>
            <Button onClick={exportCnfPdf} disabled={cnfReportRows.length === 0}>
              Export PDF
            </Button>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="hidden grid-cols-12 gap-2 border-b border-slate-200 bg-slate-50 p-3 text-sm font-medium md:grid">
<<<<<<< HEAD
              <div className="col-span-1"></div>
              <div className="col-span-3">Date</div>
              <div className="col-span-2 text-right">Trips</div>
              <div className="col-span-2 text-right">Total Revenue</div>
            </div>
            <div className="divide-y divide-slate-100">
              {cnfReportRows.map((dayGroup) => {
                const isExpanded = expandedCnfDays.has(dayGroup.date);
                return (
                  <div key={dayGroup.date}>
                    <div
                      className="p-3 cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => {
                        const newSet = new Set(expandedCnfDays);
                        if (isExpanded) {
                          newSet.delete(dayGroup.date);
                        } else {
                          newSet.add(dayGroup.date);
                        }
                        setExpandedCnfDays(newSet);
                      }}
                    >
                      <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-12 md:items-center">
                        <div className="md:col-span-1">
                          <svg
                            className={`w-5 h-5 transform transition-transform ${isExpanded ? "rotate-90" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                        <div className="md:col-span-3">
                          <div className="text-slate-600 md:hidden">Date</div>
                          <div className="font-medium">{dayGroup.date}</div>
                        </div>
                        <div className="md:col-span-2 md:text-right">
                          <div className="text-slate-600 md:hidden">Trips</div>
                          <div className="font-medium">{dayGroup.count}</div>
                        </div>
                        <div className="md:col-span-2 md:text-right">
                          <div className="text-slate-600 md:hidden">Total Revenue</div>
                          <div className="font-medium">$ {dayGroup.totalRevenue.toFixed(2)}</div>
                        </div>
                      </div>
=======
              <div className="col-span-2">Date/Time</div>
              <div className="col-span-2">CNF</div>
              <div className="col-span-2">Driver</div>
              <div className="col-span-2">Client</div>
              <div className="col-span-2">Company</div>
              <div className="col-span-1">Paid</div>
              <div className="col-span-1 text-right">Amount</div>
            </div>
            <div className="divide-y divide-slate-100">
              {cnfReportRows.map((r) => (
                <div key={r.id} className="p-3">
                  <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-12 md:items-center">
                    <div className="md:col-span-2">
                      <div className="text-slate-600 md:hidden">Date/Time</div>
                      <div className="font-medium">{r.date}</div>
                      <div className="text-xs text-slate-600">{r.time}</div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-slate-600 md:hidden">CNF</div>
                      <div className="truncate">{r.cnf}</div>
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
                      <div className="text-slate-600 md:hidden">Amount</div>
                      <div className="font-medium">$ {r.value.toFixed(2)}</div>
>>>>>>> f71f286904dbb73ecf1661dd8745672e73d919fe
                    </div>
                    {isExpanded && (
                      <div className="bg-slate-50 border-t border-slate-200">
                        <div className="hidden grid-cols-12 gap-2 border-b border-slate-200 bg-slate-100 p-3 text-xs font-medium md:grid">
                          <div className="col-span-2">Time</div>
                          <div className="col-span-2">CNF</div>
                          <div className="col-span-2">Driver</div>
                          <div className="col-span-2">Client</div>
                          <div className="col-span-2">Company</div>
                          <div className="col-span-1">Paid</div>
                          <div className="col-span-1 text-right">Amount</div>
                        </div>
                        <div className="divide-y divide-slate-200">
                          {dayGroup.trips.map((trip) => (
                            <div key={trip.id} className="p-3 pl-8">
                              <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-12 md:items-center">
                                <div className="md:col-span-2">
                                  <div className="text-slate-600 md:hidden">Time</div>
                                  <div className="text-xs text-slate-600">{trip.time}</div>
                                </div>
                                <div className="md:col-span-2">
                                  <div className="text-slate-600 md:hidden">CNF</div>
                                  <div className="truncate">{trip.cnf}</div>
                                </div>
                                <div className="md:col-span-2">
                                  <div className="text-slate-600 md:hidden">Driver</div>
                                  <div className="truncate">{trip.driver}</div>
                                </div>
                                <div className="md:col-span-2">
                                  <div className="text-slate-600 md:hidden">Client</div>
                                  <div className="truncate">{trip.client}</div>
                                </div>
                                <div className="md:col-span-2">
                                  <div className="text-slate-600 md:hidden">Company</div>
                                  <div className="truncate">{trip.company}</div>
                                </div>
                                <div className="md:col-span-1">
                                  <div className="text-slate-600 md:hidden">Paid</div>
                                  <span
                                    className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                                      trip.received === "Paid"
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-amber-50 text-amber-700"
                                    }`}
                                  >
                                    {trip.received}
                                  </span>
                                </div>
                                <div className="md:col-span-1 md:text-right">
                                  <div className="text-slate-600 md:hidden">Amount</div>
                                  <div className="font-medium">$ {trip.value.toFixed(2)}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
<<<<<<< HEAD
                );
              })}
=======
                </div>
              ))}
>>>>>>> f71f286904dbb73ecf1661dd8745672e73d919fe
              {loading ? <div className="p-3 text-sm text-slate-600">Loading...</div> : null}
              {!loading && cnfReportRows.length === 0 ? (
                <div className="p-3 text-sm text-slate-600">No CNF rows for this filter.</div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {page === "report-company" ? (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">Report - Company</div>
              <div className="text-sm text-slate-600">
<<<<<<< HEAD
                Days: <span className="font-medium text-slate-900">{companyReportRows.length}</span>
=======
                Rows: <span className="font-medium text-slate-900">{companyReportRows.length}</span>
>>>>>>> f71f286904dbb73ecf1661dd8745672e73d919fe
              </div>
            </div>
            <Button onClick={exportCompanyPdf} disabled={companyReportRows.length === 0}>
              Export PDF
            </Button>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="hidden grid-cols-12 gap-2 border-b border-slate-200 bg-slate-50 p-3 text-sm font-medium md:grid">
<<<<<<< HEAD
              <div className="col-span-1"></div>
              <div className="col-span-3">Date</div>
=======
              <div className="col-span-4">Date</div>
              <div className="col-span-4">CNF</div>
>>>>>>> f71f286904dbb73ecf1661dd8745672e73d919fe
              <div className="col-span-2 text-right">Trips</div>
              <div className="col-span-2 text-right">Total Revenue</div>
            </div>
            <div className="divide-y divide-slate-100">
<<<<<<< HEAD
              {companyReportRows.map((dayGroup) => {
                const isExpanded = expandedCompanyDays.has(dayGroup.date);
                return (
                  <div key={dayGroup.date}>
                    <div
                      className="p-3 cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => {
                        const newSet = new Set(expandedCompanyDays);
                        if (isExpanded) {
                          newSet.delete(dayGroup.date);
                        } else {
                          newSet.add(dayGroup.date);
                        }
                        setExpandedCompanyDays(newSet);
                      }}
                    >
                      <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-12 md:items-center">
                        <div className="md:col-span-1">
                          <svg
                            className={`w-5 h-5 transform transition-transform ${isExpanded ? "rotate-90" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                        <div className="md:col-span-3">
                          <div className="text-slate-600 md:hidden">Date</div>
                          <div className="font-medium">{dayGroup.date}</div>
                        </div>
                        <div className="md:col-span-2 md:text-right">
                          <div className="text-slate-600 md:hidden">Trips</div>
                          <div className="font-medium">{dayGroup.count}</div>
                        </div>
                        <div className="md:col-span-2 md:text-right">
                          <div className="text-slate-600 md:hidden">Total Revenue</div>
                          <div className="font-medium">$ {dayGroup.totalRevenue.toFixed(2)}</div>
                        </div>
                      </div>
=======
              {companyReportRows.map((r) => (
                <div key={r.id} className="p-3">
                  <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-12 md:items-center">
                    <div className="md:col-span-4">
                      <div className="text-slate-600 md:hidden">Date</div>
                      <div className="font-medium">{r.date}</div>
                    </div>
                    <div className="md:col-span-4">
                      <div className="text-slate-600 md:hidden">CNF</div>
                      <div className="truncate">{r.cnf}</div>
                    </div>
                    <div className="md:col-span-2 md:text-right">
                      <div className="text-slate-600 md:hidden">Trips</div>
                      <div className="font-medium">{r.count}</div>
                    </div>
                    <div className="md:col-span-2 md:text-right">
                      <div className="text-slate-600 md:hidden">Total Revenue</div>
                      <div className="font-medium">$ {r.totalRevenue.toFixed(2)}</div>
>>>>>>> f71f286904dbb73ecf1661dd8745672e73d919fe
                    </div>
                    {isExpanded && (
                      <div className="bg-slate-50 border-t border-slate-200">
                        <div className="hidden grid-cols-12 gap-2 border-b border-slate-200 bg-slate-100 p-3 text-xs font-medium md:grid">
                          <div className="col-span-2">Time</div>
                          <div className="col-span-2">CNF</div>
                          <div className="col-span-2">Driver</div>
                          <div className="col-span-2">Client</div>
                          <div className="col-span-2">Company</div>
                          <div className="col-span-1">Paid</div>
                          <div className="col-span-1 text-right">Amount</div>
                        </div>
                        <div className="divide-y divide-slate-200">
                          {dayGroup.trips.map((trip) => (
                            <div key={trip.id} className="p-3 pl-8">
                              <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-12 md:items-center">
                                <div className="md:col-span-2">
                                  <div className="text-slate-600 md:hidden">Time</div>
                                  <div className="text-xs text-slate-600">{trip.time}</div>
                                </div>
                                <div className="md:col-span-2">
                                  <div className="text-slate-600 md:hidden">CNF</div>
                                  <div className="truncate">{trip.cnf}</div>
                                </div>
                                <div className="md:col-span-2">
                                  <div className="text-slate-600 md:hidden">Driver</div>
                                  <div className="truncate">{trip.driver}</div>
                                </div>
                                <div className="md:col-span-2">
                                  <div className="text-slate-600 md:hidden">Client</div>
                                  <div className="truncate">{trip.client}</div>
                                </div>
                                <div className="md:col-span-2">
                                  <div className="text-slate-600 md:hidden">Company</div>
                                  <div className="truncate">{trip.company}</div>
                                </div>
                                <div className="md:col-span-1">
                                  <div className="text-slate-600 md:hidden">Paid</div>
                                  <span
                                    className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                                      trip.received === "Paid"
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-amber-50 text-amber-700"
                                    }`}
                                  >
                                    {trip.received}
                                  </span>
                                </div>
                                <div className="md:col-span-1 md:text-right">
                                  <div className="text-slate-600 md:hidden">Amount</div>
                                  <div className="font-medium">$ {trip.value.toFixed(2)}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
<<<<<<< HEAD
                );
              })}
=======
                </div>
              ))}
>>>>>>> f71f286904dbb73ecf1661dd8745672e73d919fe
              {loading ? <div className="p-3 text-sm text-slate-600">Loading...</div> : null}
              {!loading && companyReportRows.length === 0 ? (
                <div className="p-3 text-sm text-slate-600">No company report rows for this filter.</div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-sm text-slate-600">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
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

function formatDay(day: string) {
  // day = yyyy-MM-dd
  const [y, m, d] = day.split("-");
  return `${m}/${d}`;
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

function weekLabel(weekValue: string, fromMmDdYyyy: string, toMmDdYyyy: string) {
  // keep it short in the PDF header line
  return `${weekValue} (${fromMmDdYyyy || "—"} to ${toMmDdYyyy || "—"})`;
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
  const to = new Date(year, month, 0);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

function monthLabel(monthValue: string, fromMmDdYyyy: string, toMmDdYyyy: string) {
  return `${monthValue} (${fromMmDdYyyy || "—"} to ${toMmDdYyyy || "—"})`;
}

function formatDate(value: string | Date) {
  try {
    const d = value instanceof Date ? value : new Date(value);
    return d.toLocaleDateString("en-US");
  } catch {
    return typeof value === "string" ? value : "";
  }
}

function formatTime(value: string | Date) {
  try {
    const d = value instanceof Date ? value : new Date(value);
    return d.toLocaleTimeString("en-US");
  } catch {
    return "";
  }
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
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d;
}

