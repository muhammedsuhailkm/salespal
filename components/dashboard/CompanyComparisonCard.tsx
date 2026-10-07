import { Star, AlertTriangle, UserCheck, Users, XCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { clientStatusLabel } from "@/types/client";
import { statusDotClass } from "@/components/ui/Badge";

/** Pipeline-stage colours — the same hues as the client status badges (components/ui/Badge). */
export const PIPELINE_STAGE_COLORS: Record<string, string> = statusDotClass;

export type ComparisonStatus = "success" | "warning" | "neutral";

const STATUS_THEME: Record<
  ComparisonStatus,
  { badgeIcon: LucideIcon | null; badgeLabel: string | null; badge: string; accent: string; valueColor: string }
> = {
  success: {
    badgeIcon: Star,
    badgeLabel: "Top performer",
    badge: "bg-success-soft text-success-foreground",
    accent: "bg-success",
    valueColor: "text-success-foreground",
  },
  warning: {
    badgeIcon: AlertTriangle,
    badgeLabel: "Needs attention",
    badge: "bg-warning-soft text-warning-foreground",
    accent: "bg-warning",
    valueColor: "text-warning-foreground",
  },
  neutral: { badgeIcon: null, badgeLabel: null, badge: "", accent: "bg-primary", valueColor: "text-foreground" },
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function KpiTile({ icon: Icon, tone, value, label }: { icon: LucideIcon; tone: "success" | "primary" | "danger"; value: number; label: string }) {
  const chip = { success: "bg-success-soft text-success-foreground", primary: "bg-primary-soft text-primary-soft-foreground", danger: "bg-danger-soft text-danger-foreground" }[tone];
  return (
    <div className="rounded-control border border-border bg-subtle px-3 py-3">
      <div className="flex items-center gap-2">
        <span className={cn("flex size-6 items-center justify-center rounded-md", chip)}>
          <Icon size={13} strokeWidth={2.5} aria-hidden />
        </span>
        <span className="truncate text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="mt-2 text-xl font-semibold tabular-nums text-foreground">{value.toLocaleString()}</p>
    </div>
  );
}

export interface CompanyComparisonCardProps {
  orgName: string;
  status: ComparisonStatus;
  onboarded: number;
  activeLeads: number;
  lost: number;
  pipelineBreakdown: { status: string; count: number }[];
  totalClients: number;
  managerName: string;
  teamKpi: number;
  maxTeamKpi: number;
}

export function CompanyComparisonCard({
  orgName,
  status,
  onboarded,
  activeLeads,
  lost,
  pipelineBreakdown,
  totalClients,
  managerName,
  teamKpi,
  maxTeamKpi,
}: CompanyComparisonCardProps) {
  const theme = STATUS_THEME[status];
  const BadgeIcon = theme.badgeIcon;
  const gaugePct =
    maxTeamKpi > 0 ? Math.min(Math.max((teamKpi / maxTeamKpi) * 100, teamKpi > 0 ? 4 : 0), 100) : 0;

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-card border border-border bg-card shadow-card">
      <span className={cn("absolute inset-x-0 top-0 h-[3px]", theme.accent)} aria-hidden />

      <div className="flex h-full flex-col gap-5 p-5 pt-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-foreground">{orgName}</h3>
          {BadgeIcon && theme.badgeLabel && (
            <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", theme.badge)}>
              <BadgeIcon size={12} strokeWidth={2.5} aria-hidden />
              {theme.badgeLabel}
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <KpiTile icon={UserCheck} tone="success" value={onboarded} label="Onboarded" />
          <KpiTile icon={Users} tone="primary" value={activeLeads} label="Active leads" />
          <KpiTile icon={XCircle} tone="danger" value={lost} label="Lost" />
        </div>

        <div className="space-y-2.5">
          <p className="text-sm font-medium text-foreground">
            Pipeline <span className="font-normal text-muted-foreground">· {totalClients.toLocaleString()} clients</span>
          </p>
          {totalClients > 0 ? (
            <>
              <div className="flex h-2 gap-px overflow-hidden rounded-full bg-muted">
                {pipelineBreakdown.map((seg) => (
                  <div
                    key={seg.status}
                    className={cn("h-full", PIPELINE_STAGE_COLORS[seg.status] ?? "bg-muted-foreground")}
                    style={{ width: `${(seg.count / totalClients) * 100}%` }}
                    title={`${clientStatusLabel(seg.status)}: ${seg.count}`}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {pipelineBreakdown.map((seg) => (
                  <span key={seg.status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className={cn("size-2 rounded-full", PIPELINE_STAGE_COLORS[seg.status] ?? "bg-muted-foreground")} aria-hidden />
                    {clientStatusLabel(seg.status)} <span className="font-medium tabular-nums text-foreground">{seg.count.toLocaleString()}</span>
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">No clients yet</p>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between gap-4 border-t border-border pt-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary-soft-foreground">
              {getInitials(managerName)}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Manager</p>
              <p className="truncate text-sm font-medium text-foreground">{managerName}</p>
            </div>
          </div>
          <div className="w-28 shrink-0 text-right">
            <p className="text-xs text-muted-foreground">Team KPI</p>
            <p className={cn("mt-0.5 text-lg font-semibold tabular-nums", theme.valueColor)}>{teamKpi.toLocaleString()}</p>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full transition-[width] duration-500", theme.accent)} style={{ width: `${gaugePct}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
