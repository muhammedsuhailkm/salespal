import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  iconBgClass?: string;
  iconColorClass?: string;
}

export function KpiCard({
  label,
  value,
  hint,
  icon,
  iconBgClass,
  iconColorClass,
}: KpiCardProps) {
  return (
    <Card className="flex items-start justify-between rounded-2xl shadow-sm transition-all duration-200">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-muted-foreground">
          {label}
        </p>
        <p className="mt-2 text-2xl font-semibold text-foreground leading-none">
          {value}
        </p>
        {hint ? (
          <p className="mt-2.5 text-xs text-muted-foreground font-medium">
            {hint}
          </p>
        ) : null}
      </div>
      {icon ? (
        <div
          className={cn(
            "h-10 w-10 shrink-0 flex items-center justify-center rounded-xl border border-border/50 shadow-inner",
            iconBgClass ?? "bg-subtle",
            iconColorClass ?? "text-muted-foreground"
          )}
        >
          {icon}
        </div>
      ) : null}
    </Card>
  );
}
