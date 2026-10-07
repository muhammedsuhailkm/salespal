"use client";

import { cn } from "@/lib/utils";

export type CompanyOption = { id: number; name: string };

/**
 * "Which company is this for?" — shown only when the user works for more than one company
 * (with a single company the server picks it, so there's nothing to ask).
 */
export function CompanySelect({
  id,
  companies,
  value,
  onChange,
  label = "Company",
  hint,
  className,
}: {
  id: string;
  companies: CompanyOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  hint?: string;
  className?: string;
}) {
  if (companies.length < 2) return null;
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label htmlFor={id} className="text-xs font-semibold text-foreground/85">
        {label}
      </label>
      <select
        id={id}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-control border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 hover:border-border-strong focus:border-ring focus:ring-3 focus:ring-ring/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 h-10 cursor-pointer"
      >
        <option value="">Select a company...</option>
        {companies.map((c) => (
          <option key={c.id} value={c.id.toString()}>
            {c.name}
          </option>
        ))}
      </select>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Pre-selects the only company; with several the user has to choose. */
export const defaultCompanyId = (companies: CompanyOption[]) => (companies.length === 1 ? String(companies[0].id) : "");
