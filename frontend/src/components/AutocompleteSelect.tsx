import React, { useEffect, useMemo, useRef, useState } from "react";

export type AutocompleteOption = {
  id: string;
  label: string;
  disabled?: boolean;
};

export function AutocompleteSelect({
  label,
  placeholder,
  options,
  valueId,
  onChangeId,
}: {
  label: string;
  placeholder?: string;
  options: AutocompleteOption[];
  valueId: string;
  onChangeId: (id: string) => void;
}) {
  const selectedLabel = useMemo(() => options.find((o) => o.id === valueId)?.label || "", [options, valueId]);
  const [q, setQ] = useState(selectedLabel);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setQ(selectedLabel);
  }, [selectedLabel]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!ref.current) return;
      if (e.target instanceof Node && ref.current.contains(e.target)) return;
      setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    // If something is selected, the input shows the selected label.
    // When focusing the field, we still want to list other options without requiring the user to erase the text.
    if (!t || q === selectedLabel) return options.slice(0, 20);
    return options
      .filter((o) => o.label.toLowerCase().includes(t))
      .slice(0, 20);
  }, [options, q, selectedLabel]);

  return (
    <div ref={ref} className="relative w-full min-w-0">
      <div className="mb-1 text-sm font-medium text-slate-700">{label}</div>
      <input
        className="min-w-0 h-10 w-full max-w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 md:text-sm"
        placeholder={placeholder}
        value={q}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
      />
      {open ? (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="max-h-56 overflow-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-600">No results.</div>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.id}
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                    o.disabled ? "cursor-not-allowed text-slate-400" : "text-slate-800"
                  }`}
                  disabled={!!o.disabled}
                  onClick={() => {
                    onChangeId(o.id);
                    setOpen(false);
                  }}
                >
                  {o.label} {o.disabled ? "(inactive)" : ""}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}




