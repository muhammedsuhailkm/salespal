import { Star, AlertTriangle, UserCheck, Users, XCircle, type LucideIcon } from "lucide-react";
import { cn, titleCase } from "@/lib/utils";

/** Pipeline-stage palette — kept separate from the success/warning/danger semantic scale below. */
export const PIPELINE_STAGE_COLORS: Record<string, string> = {
  lead: "bg-amber-400",
  contacted: "bg-sky-400",
  follow_up: "bg-violet-400",
  proposal_sent: "bg-fuchsia-400",
  negotiation: "bg-orange-400",
  onboarding_in_progress: "bg-cyan-400",
  onboarded: "bg-emerald-400",
  active_client: "bg-green-400",
  inactive: "bg-slate-500",
  lost: "bg-rose-400",
  cancelled: "bg-red-400",
};

export type ComparisonStatus = "success" | "warning" | "neutral";

const STATUS_THEME: Record<
  ComparisonStatus,
  {
    badgeIcon: LucideIcon | null;
    badgeLabel: string | null;
    badgeBg: string;
    badgeText: string;
    accent: string;
    valueColor: string;
  }
> = {
  success: {
    badgeIcon: Star,
    badgeLabel: "Top performer",
    badgeBg: "bg-emerald-500/15 border border-emerald-500/20",
    badgeText: "text-emerald-400",
    accent: "bg-emerald-500",
    valueColor: "text-emerald-400",
  },
  warning: {
    badgeIcon: AlertTriangle,
    badgeLabel: "Needs attention",
    badgeBg: "bg-amber-500/15 border border-amber-500/20",
    badgeText: "text-amber-400",
    accent: "bg-amber-500",
    valueColor: "text-amber-400",
  },
  neutral: {
    badgeIcon: null,
    badgeLabel: null,
    badgeBg: "bg-white/10",
    badgeText: "text-slate-300",
    accent: "bg-slate-500",
    valueColor: "text-slate-200",
  },
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

function KpiTile({
  icon: Icon,
  chipBg,
  valueColor,
  value,
  label,
}: {
  icon: LucideIcon;
  chipBg: string;
  valueColor: string;
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.04] px-3 py-3.5 text-center">
      <div className={cn("mx-auto mb-3 flex h-8 w-8 items-center justify-center rounded-lg", chipBg)}>
        <Icon size={16} strokeWidth={2.5} className="text-white" />
      </div>
      <p className={cn("font-display text-2xl font-bold tabular-nums", valueColor)}>{value}</p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
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
    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
      <span className={cn("absolute inset-x-0 top-0 h-[3px]", theme.accent)} aria-hidden />

      <div className="flex h-full flex-col gap-5 p-6 pt-7">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-2xl font-bold text-white">{orgName}</h3>
          {BadgeIcon && theme.badgeLabel && (
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold",
                theme.badgeBg,
                theme.badgeText,
              )}
            >
              <BadgeIcon size={12} strokeWidth={2.5} />
              {theme.badgeLabel}
            </span>
          )}
        </div>

        {/* 3-up KPI tiles */}
        <div className="grid grid-cols-3 gap-3">
          <KpiTile
            icon={UserCheck}
            chipBg="bg-emerald-600"
            valueColor="text-emerald-400"
            value={onboarded}
            label="Onboarded"
          />
          <KpiTile
            icon={Users}
            chipBg="bg-violet-600"
            valueColor="text-violet-400"
            value={activeLeads}
            label="Active leads"
          />
          <KpiTile icon={XCircle} chipBg="bg-rose-600" valueColor="text-rose-400" value={lost} label="Lost" />
        </div>

        {/* Pipeline breakdown */}
        <div className="space-y-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Pipeline breakdown &middot; {totalClients} total
          </p>
          {totalClients > 0 ? (
            <>
              <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-800">
                {pipelineBreakdown.map((seg) => (
                  <div
                    key={seg.status}
                    className={cn("h-full", PIPELINE_STAGE_COLORS[seg.status] ?? "bg-slate-500")}
                    style={{ width: `${(seg.count / totalClients) * 100}%` }}
                    title={`${titleCase(seg.status)}: ${seg.count}`}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {pipelineBreakdown.map((seg) => (
                  <span key={seg.status} className="flex items-center gap-1.5 text-[12px] text-slate-400">
                    <span
                      className={cn("h-2 w-2 rounded-full", PIPELINE_STAGE_COLORS[seg.status] ?? "bg-slate-500")}
                    />
                    {titleCase(seg.status)} <span className="font-semibold tabular-nums text-white">{seg.count}</span>
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-500">No clients yet</p>
          )}
        </div>

        {/* Footer — pinned to bottom so both cards line up regardless of content length */}
        <div className="mt-auto flex items-center justify-between gap-4 border-t border-slate-800 pt-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Manager</p>
            <div className="mt-1.5 flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-xs font-bold text-violet-300">
                {getInitials(managerName)}
              </div>
              <span className="truncate text-sm font-semibold text-white">{managerName}</span>
            </div>
          </div>
          <div className="w-28 shrink-0 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Team KPI</p>
            <p className={cn("font-display mt-0.5 text-xl font-bold tabular-nums", theme.valueColor)}>{teamKpi}</p>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div className={cn("h-full rounded-full transition-all duration-500", theme.accent)} style={{ width: `${gaugePct}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
