import { getSalesPalSession } from "@/lib/auth";
import { getManagerSalesmanIds, getManagerOrgIds } from "@/lib/scoping";
import { prisma } from "@/lib/prisma";
import { calculateKpiScore, groupStatusCounts } from "@/lib/kpi";
import { PageHeader } from "@/components/layout/PageHeader";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { SalesmanPerfTable } from "@/components/dashboard/SalesmanPerfTable";
import { TaskOverview } from "@/components/dashboard/TaskOverview";

export default async function ManagerDashboardPage() {
  const session = await getSalesPalSession();
  const managerId = session!.user.id;
  const [salesmanIds, orgIds] = await Promise.all([getManagerSalesmanIds(managerId), getManagerOrgIds(managerId)]);
  const [salesmen, clients, tasks] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: salesmanIds } }, include: { assignedClients: { select: { status: true } } } }),
    prisma.client.findMany({ where: { org_id: { in: orgIds } }, select: { status: true } }),
    prisma.task.findMany({ where: { assigned_to_id: { in: salesmanIds } }, include: { assignedTo: { select: { name: true } } }, take: 5, orderBy: { due_date: "asc" } }),
  ]);
  const counts = groupStatusCounts(clients);
  return <><PageHeader title="Manager overview" subtitle="Team sales activity for your assigned organization." /><div className="grid gap-4 md:grid-cols-3"><KpiCard label="Team KPI" value={calculateKpiScore(counts)} /><KpiCard label="Team clients" value={clients.length} /><KpiCard label="Salesmen" value={salesmen.length} /></div><div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]"><SalesmanPerfTable salesmen={salesmen} /><TaskOverview tasks={tasks} /></div></>;
}
