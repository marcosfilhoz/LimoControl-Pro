import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/Button";
import { api } from "../lib/api";

type SettingsState = {
  ownerCompanyId?: string | null;
  logoDataUrl?: string | null;
  useVerticalLogo?: boolean;
  useLogoColor?: boolean;
  enabledModules: string[];
  pdfCompany?: string | null;
  pdfEmail?: string | null;
  pdfPhone?: string | null;
};

const moduleOptions = [
  { id: "home", label: "Home" },
  { id: "dashboard", label: "Dashboard" },
  { id: "driver-trips", label: "Driver Trips" },
  { id: "trips", label: "Trips" },
  { id: "drivers", label: "Drivers" },
  { id: "clients", label: "Clients" },
  { id: "companies", label: "Companies" },
  { id: "vehicles", label: "Vehicles" },
  { id: "users", label: "Users" },
];

export function ParametersPage() {
  const { user } = useAuth();
  const isDev = user?.role === "dev";

  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [settings, setSettings] = useState<SettingsState | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isDev) return;
    let alive = true;
    setLoading(true);
    Promise.all([api.settingsGet(), api.companiesList()])
      .then(([s, c]) => {
        if (!alive) return;
        setSettings({
          ownerCompanyId: s.ownerCompanyId ?? null,
          logoDataUrl: s.logoDataUrl ?? null,
          useVerticalLogo: s.useVerticalLogo ?? false,
          useLogoColor: s.useLogoColor ?? false,
          enabledModules: s.enabledModules || [],
          pdfCompany: s.pdfCompany ?? null,
          pdfEmail: s.pdfEmail ?? null,
          pdfPhone: s.pdfPhone ?? null,
        });
        setCompanies(c.map((item) => ({ id: item.id, name: item.name })));
      })
      .catch(() => {
        if (alive) setError("Could not load settings.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [isDev]);

  const enabledModules = settings?.enabledModules ?? [];

  const ownerCompanyName = useMemo(() => {
    if (!settings?.ownerCompanyId) return "No linked company";
    const company = companies.find((c) => c.id === settings.ownerCompanyId);
    return company?.name || "Company not found";
  }, [companies, settings?.ownerCompanyId]);

  function toggleModule(moduleId: string) {
    if (!settings) return;
    const next = enabledModules.includes(moduleId)
      ? enabledModules.filter((id) => id !== moduleId)
      : [...enabledModules, moduleId];
    setSettings({ ...settings, enabledModules: next });
    setSaved(false);
  }

  async function onLogoChange(file?: File | null) {
    if (!settings) return;
    setSaved(false);
    if (!file) {
      setSettings({ ...settings, logoDataUrl: null });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      setSettings({ ...settings, logoDataUrl: result });
    };
    reader.readAsDataURL(file);
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await api.settingsUpdate({
        ownerCompanyId: settings.ownerCompanyId ?? null,
        logoDataUrl: settings.logoDataUrl ?? null,
        useVerticalLogo: settings.useVerticalLogo ?? false,
        useLogoColor: settings.useLogoColor ?? false,
        enabledModules: settings.enabledModules,
        pdfCompany: settings.pdfCompany ?? null,
        pdfEmail: settings.pdfEmail ?? null,
        pdfPhone: settings.pdfPhone ?? null,
      });
      setSettings(updated);
      setSaved(true);
    } catch {
      setError("Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  if (!isDev) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-semibold">Settings</div>
        <div className="mt-1 text-sm text-slate-600">Only users with the Dev role can access this page.</div>
      </div>
    );
  }

  if (loading || !settings) {
    return <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xl font-semibold">Settings</div>
        <div className="text-sm text-slate-600">Base configuration and enabled modules.</div>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {saved ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">Settings saved.</div> : null}

      <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <div className="text-sm font-medium text-slate-700">Base owner company</div>
          <div className="mt-1 text-xs text-slate-500">Current: {ownerCompanyName}</div>
          <select
            className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 md:text-sm"
            value={settings.ownerCompanyId ?? ""}
            onChange={(e) => {
              setSettings({ ...settings, ownerCompanyId: e.target.value || null });
              setSaved(false);
            }}
          >
            <option value="">No link</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="text-sm font-medium text-slate-700">Upload logo</div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => onLogoChange(e.target.files?.[0] || null)}
            />
            {settings.logoDataUrl ? (
              <button
                type="button"
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                onClick={() => onLogoChange(null)}
              >
                Remove logo
              </button>
            ) : null}
          </div>
          {settings.logoDataUrl ? (
            <div className="mt-3 flex items-center gap-3">
              <img src={settings.logoDataUrl} alt="Company logo" className="h-12 w-12 rounded object-cover" />
              <div className="text-xs text-slate-500">Preview</div>
            </div>
          ) : null}
          <label className="mt-3 flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
              checked={!!settings.useVerticalLogo}
              onChange={(e) => {
                setSettings({ ...settings, useVerticalLogo: e.target.checked });
                setSaved(false);
              }}
            />
            <span>
              <span className="font-medium">Usar logo vertical</span>
              <span className="block text-xs text-slate-500">
                Ajusta a logo no PDF para ocupar a largura da tabela e empurra as informações para baixo.
              </span>
            </span>
          </label>
          <label className="mt-3 flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
              checked={!!settings.useLogoColor}
              onChange={(e) => {
                setSettings({ ...settings, useLogoColor: e.target.checked });
                setSaved(false);
              }}
            />
            <span>
              <span className="font-medium">Usar cor logo</span>
              <span className="block text-xs text-slate-500">
                Aplica preto e dourado na tabela do PDF para combinar com a logo.
              </span>
            </span>
          </label>
        </div>

        <div>
          <div className="text-sm font-medium text-slate-700">Enabled screens for this company</div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {moduleOptions.map((module) => (
              <label key={module.id} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                  checked={enabledModules.includes(module.id)}
                  onChange={() => toggleModule(module.id)}
                />
                {module.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className="text-sm font-medium text-slate-700">PDF footer (US format)</div>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 md:text-sm"
              placeholder="Company"
              value={settings.pdfCompany || ""}
              onChange={(e) => {
                setSettings({ ...settings, pdfCompany: e.target.value });
                setSaved(false);
              }}
            />
            <input
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 md:text-sm"
              placeholder="Email"
              value={settings.pdfEmail || ""}
              onChange={(e) => {
                setSettings({ ...settings, pdfEmail: e.target.value });
                setSaved(false);
              }}
            />
            <input
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 md:text-sm"
              placeholder="Phone (US)"
              value={settings.pdfPhone || ""}
              onChange={(e) => {
                setSettings({ ...settings, pdfPhone: e.target.value });
                setSaved(false);
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
