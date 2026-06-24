export const KPI_WEIGHTS = {
  lead: 1,
  contacted: 1,
  follow_up: 2,
  proposal_sent: 3,
  negotiation: 4,
  onboarding_in_progress: 4,
  onboarded: 5,
  active_client: 5,
  inactive: 0,
  lost: -1,
  cancelled: -1,
} as const;

export type KpiStatus = keyof typeof KPI_WEIGHTS;

/** Max points one client can contribute (fully onboarded / active). */
export const KPI_MAX_POINTS_PER_CLIENT = KPI_WEIGHTS.onboarded;

export function calculateKpiScore(counts: Partial<Record<KpiStatus, number>>) {
  return Object.entries(KPI_WEIGHTS).reduce((score, [status, weight]) => {
    return score + ((counts[status as KpiStatus] ?? 0) * weight);
  }, 0);
}

/** KPI score vs portfolio max — e.g. 34/50 pts → 68% pipeline progress. */
export function calculateKpiScoreProgress(
  counts: Partial<Record<KpiStatus, number>>,
  totalClients: number,
) {
  const score = calculateKpiScore(counts);
  const maxScore = totalClients * KPI_MAX_POINTS_PER_CLIENT;
  const percent =
    maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const ringPercent = Math.min(Math.max(percent, 0), 100);
  const remaining = Math.max(maxScore - score, 0);

  return { score, maxScore, percent, ringPercent, remaining, totalClients };
}

export type KpiBreakdownItem = {
  status: KpiStatus;
  label: string;
  count: number;
  weight: number;
  points: number;
};

/** Non-zero status rows for a simple “where your points come from” breakdown. */
export function getKpiScoreBreakdown(
  counts: Partial<Record<KpiStatus, number>>,
): KpiBreakdownItem[] {
  return (Object.keys(KPI_WEIGHTS) as KpiStatus[])
    .map((status) => {
      const count = counts[status] ?? 0;
      const weight = KPI_WEIGHTS[status];
      return {
        status,
        label: status.replace(/_/g, " "),
        count,
        weight,
        points: count * weight,
      };
    })
    .filter((item) => item.count > 0)
    .sort((a, b) => b.points - a.points);
}

export function groupStatusCounts(items: { status: string }[]) {
  return items.reduce<Record<string, number>>((counts, item) => {
    counts[item.status] = (counts[item.status] ?? 0) + 1;
    return counts;
  }, {});
}
