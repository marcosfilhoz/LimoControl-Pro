import { useMemo, useRef } from "react";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function usToIso(mmDdYyyy: string): string | null {
  const s = mmDdYyyy.trim();
  if (!s) return null;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  const year = Number(m[3]);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function isoToUs(yyyyMmDd: string): string {
  // yyyy-MM-dd -> MM/DD/YYYY
  const [y, m, d] = yyyyMmDd.split("-");
  if (!y || !m || !d) return "";
  return `${m}/${d}/${y}`;
}

export function DateFilterInput({
  label,
  value,
  onChange,
  placeholder = "MM/DD/YYYY",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const dateRef = useRef<HTMLInputElement | null>(null);
  const isoValue = useMemo(() => usToIso(value) || "", [value]);

  function openPicker() {
    const el: any = dateRef.current;
    if (!el) return;
    // Best-effort: some browsers support showPicker(); others block programmatic click.
    if (typeof el.showPicker === "function") el.showPicker();
  }

  return (
    <label className="block w-full min-w-0">
      <div className="mb-1 text-sm font-medium text-slate-700">{label}</div>
      <div className="relative min-w-0">
        <input
          className="min-w-0 h-10 w-full max-w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-base outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 md:text-sm"
          placeholder={placeholder}
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => openPicker()}
        />

        {/* Calendar affordance: click hits the native date input directly (works reliably on Windows/Chrome). */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <span
            aria-hidden="true"
            className="pointer-events-none inline-flex rounded-md px-2 py-1 text-xs text-slate-700"
          >
            📅
          </span>
          <input
            ref={dateRef}
            type="date"
            value={isoValue}
            onChange={(e) => onChange(isoToUs(e.target.value))}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label="Open calendar"
          />
        </div>
      </div>
    </label>
  );
}




