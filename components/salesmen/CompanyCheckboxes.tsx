"use client";

import { cn } from "@/lib/utils";

/** Pick one or more of the manager's companies for a salesman. */
export function CompanyCheckboxes({
  companies,
  value,
  onChange,
  legend = "Works for",
}: {
  companies: { id: number; name: string }[];
  value: number[];
  onChange: (ids: number[]) => void;
  legend?: string;
}) {
  const toggle = (id: number) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-medium text-foreground/85">{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {companies.map((c) => {
          const checked = value.includes(c.id);
          return (
            <label
              key={c.id}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-xs font-semibold transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-border-strong",
                checked ? "border-foreground bg-subtle text-foreground" : "border-border text-foreground/70 hover:border-border-strong",
              )}
            >
              <input type="checkbox" checked={checked} onChange={() => toggle(c.id)} className="size-4 cursor-pointer accent-slate-900" />
              <span className="truncate">{c.name}</span>
            </label>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground">The salesman can only be given clients, and see company details, for the companies ticked here.</p>
    </fieldset>
  );
}
