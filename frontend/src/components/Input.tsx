import React from "react";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function Input({ label, className = "", ...props }: Props) {
  return (
    <label className="block w-full min-w-0">
      <div className="mb-1 text-sm font-medium text-slate-700">{label}</div>
      <input
        className={`min-w-0 h-10 w-full max-w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 md:text-sm ${className}`}
        {...props}
      />
    </label>
  );
}


