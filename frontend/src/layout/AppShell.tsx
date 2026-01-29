import React, { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/Button";
import { api } from "../lib/api";

type NavItem = {
  to: string;
  label: string;
  moduleId?: string;
  adminOnly?: boolean;
  driverOnly?: boolean;
  excludeDriver?: boolean;
};

const nav: NavItem[] = [
  { to: "/", label: "Home", moduleId: "home" },
  { to: "/dashboard", label: "Dashboard", moduleId: "dashboard", excludeDriver: true },
  { to: "/driver-payouts-dashboard", label: "Driver Payouts", moduleId: "driver-payouts-dashboard", excludeDriver: true },
  { to: "/driver-closing-report", label: "Driver Closing Report", moduleId: "driver-closing-report", excludeDriver: true },
  { to: "/rides-funnel", label: "Driver Trips", moduleId: "driver-trips" },
  { to: "/trips", label: "Trips", moduleId: "trips", excludeDriver: true },
  { to: "/drivers", label: "Drivers", moduleId: "drivers", excludeDriver: true },
  { to: "/clients", label: "Client", moduleId: "clients", excludeDriver: true },
  { to: "/companies", label: "Companies", moduleId: "companies", excludeDriver: true },
  { to: "/vehicles", label: "Vehicles", moduleId: "vehicles", excludeDriver: true, adminOnly: true },
  { to: "/users", label: "Users", moduleId: "users", adminOnly: true },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";
  const isAdminOrDev = isAdmin || user?.role === "dev";
  const isDriver = user?.role === "driver";
  const isDev = user?.role === "dev";
  const [enabledModules, setEnabledModules] = useState<string[] | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .settingsGet()
      .then((s) => {
        if (alive) setEnabledModules(s.enabledModules || []);
      })
      .catch(() => {
        if (alive) setEnabledModules(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  const navItems = useMemo(() => {
    if (!enabledModules) return nav;
    return nav.filter((item) => !item.moduleId || enabledModules.includes(item.moduleId));
  }, [enabledModules]);
  const initials = (user?.name || user?.email || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              className="inline-flex flex-col justify-center gap-1 rounded-lg p-2 hover:bg-slate-100 md:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Open menu"
            >
              <span className="block h-0.5 w-5 rounded bg-slate-800" />
              <span className="block h-0.5 w-5 rounded bg-slate-800" />
              <span className="block h-0.5 w-5 rounded bg-slate-800" />
            </button>
            <Link to="/" className="text-base font-semibold">
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
                LimoControl
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                  {initials || "?"}
                </div>
                <div className="hidden sm:block">
                  <div className="text-sm font-medium leading-tight text-slate-900">{user.name || user.email}</div>
                  <div className="text-xs leading-tight text-slate-600">
                    {user.email}
                    {user.role ? (
                      <span className="ml-2 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
                        {user.role}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
            {isDev ? (
              <Link
                to="/parameters"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
                aria-label="Settings"
                title="Settings"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M12 8.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 0 0 0-7Zm9.5 3.5c0-.6-.07-1.2-.2-1.76l2-1.55l-2-3.46l-2.43.86c-.5-.4-1.05-.74-1.65-1.01L14.5 1h-4l-.72 2.08c-.6.27-1.15.6-1.65 1.01l-2.43-.86l-2 3.46l2 1.55c-.13.56-.2 1.16-.2 1.76s.07 1.2.2 1.76l-2 1.55l2 3.46l2.43-.86c.5.4 1.05.74 1.65 1.01L10.5 23h4l.72-2.08c.6-.27 1.15-.6 1.65-1.01l2.43.86l2-3.46l-2-1.55c.13-.56.2-1.16.2-1.76Zm-9.5 5.5a5.5 5.5 0 1 1 0-11a5.5 5.5 0 0 1 0 11Z"
                  />
                </svg>
              </Link>
            ) : null}
            <Button
              variant="ghost"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
        <aside className="hidden md:block">
          <nav className="rounded-xl border border-slate-200 bg-white p-2">
            {navItems
              .filter((item) => {
                if (item.adminOnly && !isAdminOrDev) return false;
                if (item.driverOnly && !isDriver) return false;
                if (item.excludeDriver && isDriver) return false;
                // Drivers only see Driver Trips, admin and user see everything
                if (isDriver && !item.driverOnly && item.to !== "/rides-funnel") return false;
                return true;
              })
              .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `block rounded-lg px-3 py-2 text-sm ${
                    isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {mobileOpen ? (
          <div className="md:hidden">
            <nav className="rounded-xl border border-slate-200 bg-white p-2">
            {navItems
                .filter((item) => {
                  if (item.adminOnly && !isAdminOrDev) return false;
                  if (item.driverOnly && !isDriver) return false;
                  if (item.excludeDriver && isDriver) return false;
                  return true;
                })
                .map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `block rounded-lg px-3 py-2 text-sm ${
                      isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        ) : null}

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}


