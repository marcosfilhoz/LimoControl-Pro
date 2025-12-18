import React, { useEffect } from "react";

export function Modal({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        className="absolute inset-0 h-full w-full bg-black/30"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative mx-auto mt-6 w-[calc(100%-2rem)] max-w-xl rounded-2xl border border-slate-200 bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="text-sm font-semibold">{title}</div>
          <button className="rounded-lg px-2 py-1 text-sm text-slate-700 hover:bg-slate-100" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="max-h-[75vh] overflow-auto p-4">{children}</div>
      </div>
    </div>
  );
}




