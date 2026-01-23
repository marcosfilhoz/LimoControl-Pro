import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function HomePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isDriver = user?.role === "driver";

  const quickLinks = [
    ...(isDriver
      ? [
          {
            to: "/rides-funnel",
            title: "Driver Trips",
            description: "View and manage your rides",
            icon: "🚗",
          },
        ]
      : [
          {
            to: "/dashboard",
            title: "Dashboard",
            description: "System overview and analytics",
            icon: "📊",
          },
          {
            to: "/trips",
            title: "Trips",
            description: "Manage all trips",
            icon: "📍",
          },
          {
            to: "/rides-funnel",
            title: "Driver Trips",
            description: "Driver trips",
            icon: "🚗",
          },
        ]),
    ...(isAdmin || !isDriver
      ? [
          {
            to: "/drivers",
            title: "Drivers",
            description: "Manage drivers",
            icon: "👨‍✈️",
          },
          {
            to: "/clients",
            title: "Clients",
            description: "Manage clients",
            icon: "👤",
          },
          {
            to: "/companies",
            title: "Companies",
            description: "Manage companies",
            icon: "🏢",
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            to: "/users",
            title: "Users",
            description: "Manage system users",
            icon: "👥",
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-8">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold text-slate-900">
            Welcome, {user?.name || "User"}!
          </h1>
          <p className="mt-2 text-lg text-slate-600">
            {isDriver
              ? "Manage your rides and keep everything organized."
              : "Access system features through the cards below."}
          </p>
        </div>
      </div>

      {/* Quick Links Grid */}
      <div>
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Quick Access</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="group rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-2xl transition-colors group-hover:bg-slate-200">
                  {link.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 group-hover:text-slate-700">
                    {link.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">{link.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Actions for Drivers */}
      {isDriver && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/rides-funnel"
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              View My Rides
            </Link>
          </div>
        </div>
      )}

      {/* Quick Actions for Admin/User */}
      {!isDriver && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              View Dashboard
            </Link>
            <Link
              to="/trips"
              className="inline-flex items-center justify-center rounded-lg bg-transparent px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              Manage Trips
            </Link>
            {isAdmin && (
              <Link
                to="/users"
                className="inline-flex items-center justify-center rounded-lg bg-transparent px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                Manage Users
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
