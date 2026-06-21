export const KPI_WEIGHTS = {
  onboarded: 5,
  follow_up: 2,
  new_lead: 1,
  lost: -1,
  target: 0,
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
