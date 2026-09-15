import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "positive" | "warning" | "negative" | "info" | "accent" | "neutral";

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  positive: "ss-badge-positive",
  warning: "ss-badge-warning",
  negative: "ss-badge-negative",
  info: "ss-badge-info",
  accent: "ss-badge-accent",
  neutral: "ss-badge-neutral",
};

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  icon?: LucideIcon;
  className?: string;
}

export function Badge({ label, variant = "neutral", icon: Icon, className }: BadgeProps) {
  return (
    <span className={cn("ss-badge", VARIANT_CLASS[variant], className)}>
      {Icon && <Icon size={12} className="shrink-0" style={{ strokeWidth: 2.2 }} />}
      {label}
    </span>
  );
}
