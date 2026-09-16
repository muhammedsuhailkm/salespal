import { TrendingUp, TrendingDown, Minus, MoreHorizontal, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatCardTheme {
  /** Solid Tailwind background class, e.g. "bg-teal-600" — needs to carry white text at AA contrast. */
  bg: string;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  badgeLabel,
  badgeDirection,
  caption,
  theme,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  /** Text shown in the pill, e.g. "+12%" or "3 pending". Omit to hide the pill. */
  badgeLabel?: string;
  badgeDirection?: "up" | "down" | "flat";
  /** Free-form line under the number, e.g. "Vs last month: 340". Omit to hide. */
  caption?: React.ReactNode;
  theme: StatCardTheme;
}) {
  const TrendIcon =
    badgeDirection === "up" ? TrendingUp : badgeDirection === "down" ? TrendingDown : Minus;

  return (
    <div className={cn("rounded-3xl p-5 text-white shadow-sm", theme.bg)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-sm font-medium text-white/90">
          <Icon size={15} strokeWidth={2.25} />
          {label}
        </div>
        <MoreHorizontal size={18} className="text-white/50" aria-hidden />
      </div>

      <div className="mt-5 flex items-end justify-between gap-2">
        <p className="text-3xl font-semibold leading-none tabular-nums">{value}</p>
        {badgeLabel && (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-[11px] font-semibold">
            <TrendIcon size={11} strokeWidth={2.5} />
            {badgeLabel}
          </span>
        )}
      </div>

      {caption && (
        <div className="mt-4 border-t border-white/15 pt-3 text-xs text-white/70">{caption}</div>
      )}
    </div>
  );
}
