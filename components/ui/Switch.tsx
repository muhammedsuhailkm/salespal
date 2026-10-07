"use client";

import { cn } from "@/lib/utils";

/** On/off toggle (role="switch"). Pair with a visible label via `aria-labelledby` or `label`. */
export function Switch({
  checked,
  onChange,
  label,
  description,
  tone = "primary",
  id,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  tone?: "primary" | "warning" | "danger";
  id?: string;
  disabled?: boolean;
  className?: string;
}) {
  const on = { primary: "bg-primary", warning: "bg-warning", danger: "bg-danger" }[tone];
  const button = (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-labelledby={label && id ? `${id}-label` : undefined}
      aria-describedby={description && id ? `${id}-desc` : undefined}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? on : "bg-border-strong",
      )}
    >
      <span
        className={cn(
          "size-5 rounded-full bg-card shadow-sm transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
          checked ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
  if (!label) return button;
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <div className="min-w-0">
        <span id={id ? `${id}-label` : undefined} className="block text-sm font-medium text-foreground">{label}</span>
        {description ? <span id={id ? `${id}-desc` : undefined} className="block text-xs text-muted-foreground">{description}</span> : null}
      </div>
      {button}
    </div>
  );
}
