import { getSalesPalSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateKpiScore, groupStatusCounts } from "@/lib/kpi";
import { PageHeader } from "@/components/layout/PageHeader";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { TaskOverview } from "@/components/dashboard/TaskOverview";
import { Target, Briefcase, TrendingUp, ListTodo, Phone, Calendar } from "lucide-react";

export default async function SalesmanDashboardPage() {
  const session = await getSalesPalSession();
  const userId = session!.user.id;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    clients,
    tasks,
    logs,
    onboardedThisMonth,
    pendingTasksCount
  ] = await Promise.all([
    prisma.client.findMany({
      where: { assigned_salesman_id: userId },
      select: { status: true }
    }),
    prisma.task.findMany({
      where: { assigned_to_id: userId },
      include: { assignedTo: { select: { name: true } } },
      orderBy: { due_date: "asc" },
      take: 5
    }),
    prisma.clientLog.findMany({
      where: { done_by: userId },
      include: { author: { select: { name: true } } },
      orderBy: { created_at: "desc" },
      take: 5
    }),
    prisma.clientLog.count({
      where: {
        done_by: userId,
        action: { contains: "onboarded" },
        created_at: { gte: startOfMonth }
      }
    }),
    prisma.task.count({
      where: {
        assigned_to_id: userId,
        status: { in: ["pending", "in_process"] }
      }
    })
  ]);

  const counts = groupStatusCounts(clients);
  const totalClients = clients.length;
  const onboardedClients = counts.onboarded ?? 0;
  const conversionRate = totalClients > 0 ? Math.round((onboardedClients / totalClients) * 100) : 0;

  return (
    <>
      <PageHeader title="My Dashboard" subtitle="Your sales performance and activities" />
      
      {/* 6 Grid Metric Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="KPI Score"
          value={calculateKpiScore(counts)}
          hint="Total points earned"
          icon={<Target size={20} />}
          iconBgClass="bg-blue-50/70"
          iconColorClass="text-blue-600"
        />
        <KpiCard
          label="My Clients"
          value={totalClients}
          hint={`${onboardedThisMonth} onboarded this month`}
          icon={<Briefcase size={20} />}
          iconBgClass="bg-teal-50/70"
          iconColorClass="text-teal-600"
        />
        <KpiCard
          label="Conversion Rate"
          value={`${conversionRate}%`}
          hint={`${totalClients} leads, ${onboardedClients} converted`}
          icon={<TrendingUp size={20} />}
          iconBgClass="bg-amber-50/70"
          iconColorClass="text-amber-600"
        />
        <KpiCard
          label="Pending Tasks"
          value={pendingTasksCount}
          icon={<ListTodo size={20} />}
          iconBgClass="bg-purple-50/70"
          iconColorClass="text-purple-600"
        />
        <KpiCard
          label="Today's Follow-ups"
          value={counts.follow_up ?? 0}
          icon={<Phone size={20} />}
          iconBgClass="bg-red-50/70"
          iconColorClass="text-red-500"
        />
        <KpiCard
          label="Upcoming Meetings"
          value={0}
          icon={<Calendar size={20} />}
          iconBgClass="bg-sky-50/70"
          iconColorClass="text-sky-600"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <TaskOverview tasks={tasks} />
        <ActivityFeed items={logs} />
      </div>
    </>
  );
}
