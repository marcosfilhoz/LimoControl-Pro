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
            title: "Rides Funnel",
            description: "Visualize e gerencie suas corridas",
            icon: "🚗",
          },
        ]
      : [
          {
            to: "/dashboard",
            title: "Dashboard",
            description: "Visão geral e análises do sistema",
            icon: "📊",
          },
          {
            to: "/trips",
            title: "Trips",
            description: "Gerenciar todas as corridas",
            icon: "📍",
          },
          {
            to: "/rides-funnel",
            title: "Rides Funnel",
            description: "Funil de corridas",
            icon: "🚗",
          },
        ]),
    ...(isAdmin || !isDriver
      ? [
          {
            to: "/drivers",
            title: "Drivers",
            description: "Gerenciar motoristas",
            icon: "👨‍✈️",
          },
          {
            to: "/clients",
            title: "Clients",
            description: "Gerenciar clientes",
            icon: "👤",
          },
          {
            to: "/companies",
            title: "Companies",
            description: "Gerenciar empresas",
            icon: "🏢",
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            to: "/users",
            title: "Users",
            description: "Gerenciar usuários do sistema",
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
            Bem-vindo, {user?.name || "Usuário"}!
          </h1>
          <p className="mt-2 text-lg text-slate-600">
            {isDriver
              ? "Gerencie suas corridas e mantenha tudo organizado."
              : "Acesse as funcionalidades do sistema através dos cards abaixo."}
          </p>
        </div>
      </div>

      {/* Quick Links Grid */}
      <div>
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Acesso Rápido</h2>
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
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Ações Rápidas</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/rides-funnel"
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              Ver Minhas Corridas
            </Link>
          </div>
        </div>
      )}

      {/* Quick Actions for Admin/User */}
      {!isDriver && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Ações Rápidas</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              Ver Dashboard
            </Link>
            <Link
              to="/trips"
              className="inline-flex items-center justify-center rounded-lg bg-transparent px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              Gerenciar Corridas
            </Link>
            {isAdmin && (
              <Link
                to="/users"
                className="inline-flex items-center justify-center rounded-lg bg-transparent px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                Gerenciar Usuários
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
