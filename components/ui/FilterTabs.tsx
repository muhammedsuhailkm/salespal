"use client";

import { cn } from "@/lib/utils";

/** Status filter tabs with optional counts ("All 120 · Quoted 14 …"). */
export function FilterTabs<T extends string>({
  value,
  onChange,
  tabs,
  label,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  tabs: readonly { value: T; label: string; count?: number }[];
  label: string;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className={cn("flex flex-wrap gap-1 rounded-control bg-muted p-1", className)}>
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cn(
              "press inline-flex cursor-pointer items-center gap-1.5 rounded-[calc(var(--radius-control)-2px)] px-3 py-1.5 text-xs font-medium",
              active ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={cn("tabular-nums", active ? "text-muted-foreground" : "text-muted-foreground/70")}>{t.count.toLocaleString()}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
