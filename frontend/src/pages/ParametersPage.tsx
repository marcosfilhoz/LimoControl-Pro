import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/Button";
import { api } from "../lib/api";

type SettingsState = {
  ownerCompanyId?: string | null;
  logoDataUrl?: string | null;
  enabledModules: string[];
};

const moduleOptions = [
  { id: "home", label: "Home" },
  { id: "dashboard", label: "Dashboard" },
  { id: "driver-trips", label: "Driver Trips" },
  { id: "trips", label: "Trips" },
  { id: "drivers", label: "Drivers" },
  { id: "clients", label: "Clients" },
  { id: "companies", label: "Companies" },
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
          enabledModules: s.enabledModules || [],
        });
        setCompanies(c.map((item) => ({ id: item.id, name: item.name })));
      })
      .catch(() => {
        if (alive) setError("Não foi possível carregar os parâmetros.");
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
    if (!settings?.ownerCompanyId) return "Nenhuma empresa vinculada";
    const company = companies.find((c) => c.id === settings.ownerCompanyId);
    return company?.name || "Empresa não encontrada";
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
        enabledModules: settings.enabledModules,
      });
      setSettings(updated);
      setSaved(true);
    } catch {
      setError("Não foi possível salvar os parâmetros.");
    } finally {
      setSaving(false);
    }
  }

  if (!isDev) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-semibold">Parâmetros</div>
        <div className="mt-1 text-sm text-slate-600">Apenas usuários com role Dev têm acesso.</div>
      </div>
    );
  }

  if (loading || !settings) {
    return <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xl font-semibold">Parâmetros</div>
        <div className="text-sm text-slate-600">Configurações da base e módulos ativos.</div>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {saved ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">Parâmetros salvos.</div> : null}

      <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <div className="text-sm font-medium text-slate-700">Vínculo da empresa dona da base</div>
          <div className="mt-1 text-xs text-slate-500">Atual: {ownerCompanyName}</div>
          <select
            className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 md:text-sm"
            value={settings.ownerCompanyId ?? ""}
            onChange={(e) => {
              setSettings({ ...settings, ownerCompanyId: e.target.value || null });
              setSaved(false);
            }}
          >
            <option value="">Sem vínculo</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="text-sm font-medium text-slate-700">Upload da logo</div>
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
                Remover logo
              </button>
            ) : null}
          </div>
          {settings.logoDataUrl ? (
            <div className="mt-3 flex items-center gap-3">
              <img src={settings.logoDataUrl} alt="Logo da empresa" className="h-12 w-12 rounded object-cover" />
              <div className="text-xs text-slate-500">Pré-visualização</div>
            </div>
          ) : null}
        </div>

        <div>
          <div className="text-sm font-medium text-slate-700">Telas ativas para a empresa</div>
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

        <div className="flex items-center gap-2">
          <Button onClick={save} disabled={saving}>
            {saving ? "Salvando..." : "Salvar parâmetros"}
          </Button>
        </div>
      </div>
    </div>
  );
}
