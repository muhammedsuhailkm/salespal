import { prisma } from "@/lib/prisma";
import { calculateKpiScore, groupStatusCounts } from "@/lib/kpi";
import { PageHeader } from "@/components/layout/PageHeader";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { SalesmanPerfTable } from "@/components/dashboard/SalesmanPerfTable";

export default async function AdminDashboardPage() {
  const [clients, tasks, logs, salesmen] = await Promise.all([
    prisma.client.findMany({ select: { status: true } }),
    prisma.task.count(),
    prisma.clientLog.findMany({ orderBy: { created_at: "desc" }, take: 6, include: { author: { select: { name: true } } } }),
    prisma.user.findMany({ where: { role_id: 3 }, include: { assignedClients: { select: { status: true } } } }),
  ]);
  const counts = groupStatusCounts(clients);

  return <><PageHeader title="Owner overview" subtitle="All company sales health across Company A and Company B." /><div className="grid gap-4 md:grid-cols-4"><KpiCard label="KPI score" value={calculateKpiScore(counts)} /><KpiCard label="Clients" value={clients.length} /><KpiCard label="Open tasks" value={tasks} /><KpiCard label="Onboarded" value={counts.onboarded ?? 0} /></div><div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]"><SalesmanPerfTable salesmen={salesmen} /><ActivityFeed items={logs} /></div></>;
}
