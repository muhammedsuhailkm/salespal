import { getSalesPalSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateKpiScore, groupStatusCounts } from "@/lib/kpi";
import { PageHeader } from "@/components/layout/PageHeader";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { TaskOverview } from "@/components/dashboard/TaskOverview";

export default async function SalesmanDashboardPage() {
  const session = await getSalesPalSession();
  const userId = session!.user.id;
  const [clients, tasks, logs] = await Promise.all([
    prisma.client.findMany({ where: { assigned_salesman_id: userId }, select: { status: true } }),
    prisma.task.findMany({ where: { assigned_to_id: userId }, include: { assignedTo: { select: { name: true } } }, orderBy: { due_date: "asc" }, take: 5 }),
    prisma.clientLog.findMany({ where: { done_by: userId }, include: { author: { select: { name: true } } }, orderBy: { created_at: "desc" }, take: 5 }),
  ]);
  const counts = groupStatusCounts(clients);
  return <><PageHeader title="My dashboard" subtitle="Your clients, task load, and sales score." /><div className="grid gap-4 md:grid-cols-3"><KpiCard label="My KPI" value={calculateKpiScore(counts)} /><KpiCard label="My clients" value={clients.length} /><KpiCard label="Follow ups" value={counts.follow_up ?? 0} /></div><div className="mt-6 grid gap-6 lg:grid-cols-2"><TaskOverview tasks={tasks} /><ActivityFeed items={logs} /></div></>;
}
