import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { RequireAuth } from "./auth/RequireAuth";
import { AppShell } from "./layout/AppShell";
import { ClientsPage } from "./pages/ClientsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DriverClosingReportPage } from "./pages/DriverClosingReportPage";
import { DriverPayoutsDashboardPage } from "./pages/DriverPayoutsDashboardPage";
import { DriversPage } from "./pages/DriversPage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { DriverTripsPage } from "./pages/RidesFunnelPage";
import { TripsPage } from "./pages/TripsPage";
import { UsersPage } from "./pages/UsersPage";
import { CompaniesPage } from "./pages/CompaniesPage";
import { ParametersPage } from "./pages/ParametersPage";
import { VehiclesPage } from "./pages/VehiclesPage";

function HomeRedirect() {
  return <Navigate to="/" replace />;
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
                  <Route path="/driver-payouts-dashboard" element={<DriverPayoutsDashboardPage />} />
                  <Route path="/driver-closing-report" element={<DriverClosingReportPage />} />
                  <Route path="/rides-funnel" element={<DriverTripsPage />} />
                  <Route path="/trips" element={<TripsPage />} />
                  <Route path="/drivers" element={<DriversPage />} />
                  <Route path="/clients" element={<ClientsPage />} />
                  <Route path="/companies" element={<CompaniesPage />} />
                  <Route path="/vehicles" element={<VehiclesPage />} />
                  <Route path="/users" element={<UsersPage />} />
                  <Route path="/parameters" element={<ParametersPage />} />
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


