import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "primary" | "success" | "warning" | "danger" | "info" | "neutral";

const iconTones: Record<Tone, string> = {
  primary: "bg-primary-soft text-primary-soft-foreground",
  success: "bg-success-soft text-success-foreground",
  warning: "bg-warning-soft text-warning-foreground",
  danger: "bg-danger-soft text-danger-foreground",
  info: "bg-info-soft text-info-foreground",
  neutral: "bg-muted text-muted-foreground",
};

/**
 * KPI card: label, large figure, short definition of what it measures.
 * The figure scales with the card's own width (container query), so 7+ digit
 * amounts fit without overflowing at any grid size.
 */
export function KpiTile({
  icon: Icon,
  label,
  value,
  meta,
  definition,
  tone = "primary",
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  /** Small pill beside the label, e.g. "12 orders". */
  meta?: React.ReactNode;
  /** One sentence explaining what the number counts. */
  definition: string;
  tone?: Tone;
  href?: string;
}) {
  const body = (
    <div className="@container flex h-full flex-col rounded-card border border-border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-[10px]", iconTones[tone])}>
            <Icon size={16} aria-hidden />
          </span>
          <span className="truncate text-sm font-medium text-muted-foreground">{label}</span>
        </div>
        {meta != null && (
          <span className="shrink-0 whitespace-nowrap rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
            {meta}
          </span>
        )}
      </div>
      <p className="mt-4 [overflow-wrap:anywhere] text-xl font-semibold leading-tight tracking-tight text-foreground tabular-nums @[13rem]:text-2xl @[17rem]:text-[28px]">
        {value}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{definition}</p>
    </div>
  );

  if (!href) return body;
  return (
    <Link
      href={href}
      className="group block h-full rounded-card transition-transform hover:-translate-y-0.5 [&>div]:transition-colors [&>div]:group-hover:border-border-strong"
    >
      {body}
    </Link>
  );
}
