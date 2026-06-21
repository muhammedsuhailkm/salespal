import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label?: string };

export function Input({ label, className, id, ...props }: InputProps) {
  const inputId = id ?? props.name ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <label className="block text-sm font-medium text-slate-700" htmlFor={inputId}>
      {label ? <span className="mb-1 block">{label}</span> : null}
      <input
        id={inputId}
        className={cn("h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200", className)}
        {...props}
      />
    </label>
  );
}
