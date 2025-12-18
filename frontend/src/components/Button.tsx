import React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
};

export function Button({ className = "", variant = "primary", ...props }: Props) {
  const base =
    "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-60";
  const styles =
    variant === "primary"
      ? "bg-slate-900 text-white hover:bg-slate-800"
      : "bg-transparent text-slate-700 hover:bg-slate-100";
  return <button className={`${base} ${styles} ${className}`} {...props} />;
}


