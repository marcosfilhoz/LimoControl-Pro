import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { RequireAuth } from "./auth/RequireAuth";
import { AppShell } from "./layout/AppShell";
import { ClientsPage } from "./pages/ClientsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DriversPage } from "./pages/DriversPage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { RidesFunnelPage } from "./pages/RidesFunnelPage";
import { TripsPage } from "./pages/TripsPage";
import { UsersPage } from "./pages/UsersPage";
import { CompaniesPage } from "./pages/CompaniesPage";

function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={user?.role === "driver" ? "/rides-funnel" : "/dashboard"} replace />;
}

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <AppShell>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/rides-funnel" element={<RidesFunnelPage />} />
                  <Route path="/trips" element={<TripsPage />} />
                  <Route path="/drivers" element={<DriversPage />} />
                  <Route path="/clients" element={<ClientsPage />} />
                  <Route path="/companies" element={<CompaniesPage />} />
                  <Route path="/users" element={<UsersPage />} />
                  <Route path="*" element={<HomeRedirect />} />
                </Routes>
              </AppShell>
            </RequireAuth>
          }
        />
      </Routes>
    </AuthProvider>
  );
}


