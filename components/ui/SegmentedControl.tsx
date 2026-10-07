"use client";

import { cn } from "@/lib/utils";

/** Pick one of a few options in place (unit, period, mode). A radiogroup for assistive tech. */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  size = "md",
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: React.ReactNode }[];
  /** Accessible name for the group. */
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex rounded-control bg-muted p-0.5", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "press inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-[calc(var(--radius-control)-2px)] font-medium",
              size === "sm" ? "h-7 min-w-9 px-2.5 text-xs" : "h-8 min-w-10 px-3 text-sm",
              active ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
