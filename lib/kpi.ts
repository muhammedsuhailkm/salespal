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

export function calculateKpiScore(counts: Partial<Record<KpiStatus, number>>) {
  return Object.entries(KPI_WEIGHTS).reduce((score, [status, weight]) => {
    return score + ((counts[status as KpiStatus] ?? 0) * weight);
  }, 0);
}

export function groupStatusCounts(items: { status: string }[]) {
  return items.reduce<Record<string, number>>((counts, item) => {
    counts[item.status] = (counts[item.status] ?? 0) + 1;
    return counts;
  }, {});
}
