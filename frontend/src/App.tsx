import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { RequireAuth } from "./auth/RequireAuth";
import { AppShell } from "./layout/AppShell";
import { ClientsPage } from "./pages/ClientsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DriversPage } from "./pages/DriversPage";
import { LoginPage } from "./pages/LoginPage";
import { TripsPage } from "./pages/TripsPage";
import { UsersPage } from "./pages/UsersPage";
import { CompaniesPage } from "./pages/CompaniesPage";

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
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/trips" element={<TripsPage />} />
                  <Route path="/drivers" element={<DriversPage />} />
                  <Route path="/clients" element={<ClientsPage />} />
                  <Route path="/companies" element={<CompaniesPage />} />
                  <Route path="/users" element={<UsersPage />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </AppShell>
            </RequireAuth>
          }
        />
      </Routes>
    </AuthProvider>
  );
}


