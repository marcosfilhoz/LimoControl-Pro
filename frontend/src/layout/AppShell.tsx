import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/Button";

type NavItem = { to: string; label: string; adminOnly?: boolean };

const nav: NavItem[] = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/trips", label: "Trips" },
  { to: "/drivers", label: "Drivers" },
  { to: "/clients", label: "Cadastro de Cliente" },
  { to: "/companies", label: "Companies" },
  { to: "/users", label: "Users", adminOnly: true },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";
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
            <Link to="/dashboard" className="text-base font-semibold">
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
            {nav
              .filter((item) => !item.adminOnly || isAdmin)
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
              {nav
                .filter((item) => !item.adminOnly || isAdmin)
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


