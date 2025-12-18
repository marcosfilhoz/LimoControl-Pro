import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { clearSavedCreds, getSavedCreds, setSavedCreds } from "../lib/storage";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const saved = getSavedCreds();
  const [email, setEmail] = useState(saved?.email || "admin@limo.local");
  const [password, setPassword] = useState(saved?.password || "admin123");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(saved?.remember || false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      if (remember) setSavedCreds({ email, password, remember: true });
      else clearSavedCreds();
      navigate("/dashboard");
    } catch (e: any) {
      // api.ts throws { status, body } when server responds; fetch errors come as TypeError
      if (e?.status === 401) {
        setError("Invalid email or password.");
      } else if (e?.status) {
        const msg = typeof e?.body?.error === "string" ? e.body.error : null;
        setError(msg ? `API error: ${msg}` : `API error (HTTP ${e.status}).`);
      } else {
        setError("Could not connect to the API. Make sure the backend is running and VITE_API_URL is set.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 items-center gap-8 px-4 py-10 md:grid-cols-2">
        <div className="hidden md:block">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700">
            <span className="h-2 w-2 rounded-full bg-slate-900" />
            Trip management
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
            LimoControl
          </h1>
          <p className="mt-2 max-w-md text-slate-600">
            Web dashboard for drivers, clients, partner companies, and trips — with payment tracking and reports.
          </p>
          <div className="mt-6 grid max-w-md grid-cols-1 gap-3">
            <Feature title="Fast" desc="Create records and log trips in just a few clicks." />
            <Feature title="Organized" desc="Filters by period, client, company, and payment status." />
            <Feature title="Reports" desc="PDF export to share easily." />
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
            <div className="mb-6">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
                <div className="text-lg font-semibold">Sign in</div>
              </div>
              <div className="mt-1 text-sm text-slate-600">Access the trip control panel.</div>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />

              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="pr-20"
                />
                <button
                  type="button"
                  className="absolute right-2 top-8 rounded-lg px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Save email and password on this device
              </label>

              {error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <Button className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>

              <div className="text-xs text-slate-500">
                Developer: <span className="font-mono">Marcos</span> /{" "}
                <span className="font-mono">Filho</span>
              </div>
            </form>
          </div>
          <div className="mt-4 text-center text-xs text-slate-500">
            © {new Date().getFullYear()} LimoControl
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-sm text-slate-600">{desc}</div>
    </div>
  );
}


