import React, { useMemo } from "react";

export type BarListItem = {
  label: string;
  value: number;
  valueLabel?: string;
};

export function BarList({ title, items }: { title: string; items: BarListItem[] }) {
  const max = useMemo(() => items.reduce((m, i) => Math.max(m, i.value), 0), [items]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? <div className="text-sm text-slate-600">No data.</div> : null}
        {items.map((it) => {
          const pct = max ? Math.round((it.value / max) * 100) : 0;
          return (
            <div key={it.label} className="grid grid-cols-[1fr_auto] items-center gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm text-slate-800">{it.label}</div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-slate-900" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="whitespace-nowrap text-sm font-medium text-slate-800">
                {it.valueLabel ?? it.value.toFixed(0)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


