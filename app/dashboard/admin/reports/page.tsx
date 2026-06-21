import { prisma } from "@/lib/prisma";
import { calculateKpiScore, groupStatusCounts } from "@/lib/kpi";
import { PageHeader } from "@/components/layout/PageHeader";
import { KpiCard } from "@/components/dashboard/KpiCard";

export default async function ReportsPage() {
  const clients = await prisma.client.findMany({ select: { status: true } });
  const salesmen = await prisma.user.findMany({ where: { role_id: 3 }, include: { assignedClients: { select: { status: true } } } });
  const top = salesmen.map((user) => ({ name: user.name, score: calculateKpiScore(groupStatusCounts(user.assignedClients)) })).sort((a, b) => b.score - a.score)[0];
  const counts = groupStatusCounts(clients);
  return <><PageHeader title="Reports" subtitle="Monthly-style summary from the current SalesPal data." /><div className="grid gap-4 md:grid-cols-3"><KpiCard label="Top performer" value={top?.name ?? "-"} hint={`${top?.score ?? 0} KPI points`} /><KpiCard label="Total KPI" value={calculateKpiScore(counts)} /><KpiCard label="Follow ups" value={counts.follow_up ?? 0} /></div></>;
}
