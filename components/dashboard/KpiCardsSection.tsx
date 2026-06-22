import { getSalesPalSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateKpiScore, groupStatusCounts } from "@/lib/kpi";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { Target, Briefcase, TrendingUp, ListTodo, Phone, Calendar } from "lucide-react";

export async function KpiCardsSection() {
  const session = await getSalesPalSession();
  const userId = session!.user.id;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [clients, onboardedThisMonth, pendingTasksCount] = await Promise.all([
    prisma.client.findMany({
      where: { assigned_salesman_id: userId },
      select: { status: true },
    }),
    prisma.clientLog.count({
      where: {
        done_by: userId,
        action: { contains: "onboarded" },
        created_at: { gte: startOfMonth },
      },
    }),
    prisma.task.count({
      where: {
        assigned_to_id: userId,
        status: { in: ["pending", "in_process"] },
      },
    }),
  ]);

  const counts = groupStatusCounts(clients);
  const totalClients = clients.length;
  const onboardedClients = counts.onboarded ?? 0;
  const conversionRate =
    totalClients > 0 ? Math.round((onboardedClients / totalClients) * 100) : 0;

  return (
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
  );
}

export function KpiCardsSkeleton() {
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-start justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex-1 min-w-0">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-3.5 h-6 w-12" />
            <Skeleton className="mt-4 h-3 w-32" />
          </div>
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
      ))}
    </div>
  );
}
