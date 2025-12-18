import React, { useEffect, useRef } from "react";

export type ContextMenuItem = {
  label: string;
  onClick: () => void;
  danger?: boolean;
};

export function ContextMenu({
  open,
  x,
  y,
  items,
  onClose,
}: {
  open: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!ref.current) return;
      if (e.target instanceof Node && ref.current.contains(e.target)) return;
      onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      window.addEventListener("mousedown", onDown);
      window.addEventListener("keydown", onKey);
      window.addEventListener("scroll", onClose, true);
    }
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="fixed z-50 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
      style={{ left: x, top: y }}
    >
      {items.map((it) => (
        <button
          key={it.label}
          className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${
            it.danger ? "text-red-700" : "text-slate-800"
          }`}
          onClick={() => {
            it.onClick();
            onClose();
          }}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}




