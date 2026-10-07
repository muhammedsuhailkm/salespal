import { Suspense } from "react";
import { getSalesPalSession } from "@/lib/auth";
import { getManagerTeam } from "@/lib/manager-dashboard";
import { getSalesmenWithTargets } from "@/lib/salesman-targets";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { ManagerTeamClient } from "./ManagerTeamClient";

export default function TeamPage() {
  return (
    <>
      <PageHeader title="Team" subtitle="Your salesmen, their KPIs, targets and progress." />
      <Suspense fallback={<TeamSkeleton />}>
        <TeamSection />
      </Suspense>
    </>
  );
}

async function TeamSection() {
  const session = await getSalesPalSession();
  const managerId = Number(session!.user.id);
  const [team, targets, managerOrgs, links] = await Promise.all([
    getManagerTeam(managerId),
    getSalesmenWithTargets({ id: managerId, role_id: 2 }),
    prisma.managerOrg.findMany({ where: { manager_id: managerId }, select: { org: { select: { id: true, name: true } } }, orderBy: { org: { name: "asc" } } }),
    prisma.managerSalesman.findMany({ where: { manager_id: managerId }, select: { salesman_id: true, org_id: true } }),
  ]);

  const kpiScores = Object.fromEntries(team.map((s) => [s.id, s.kpiScore]));
  // Which of this manager's companies each salesman works for.
  const salesmanCompanies: Record<number, number[]> = {};
  for (const l of links) (salesmanCompanies[l.salesman_id] ??= []).push(l.org_id);

  return (
    <ManagerTeamClient
      kpiScores={kpiScores}
      teamSize={team.length}
      targets={targets}
      companies={managerOrgs.map((m) => m.org)}
      salesmanCompanies={salesmanCompanies}
    />
  );
}

function TeamSkeleton() {
  return (
    <div className="space-y-6 animate-page-in">
      <div className="flex items-center justify-between bg-card p-5 rounded-card border border-border/80 shadow-card flex-wrap gap-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-72" />
          </div>
        </div>
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>

      <div className="overflow-x-auto rounded-card border border-border bg-card shadow-card">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr_0.7fr] gap-4 bg-muted px-5 py-3.5 border-b border-border">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-18" />
            <Skeleton className="h-3.5 w-16 justify-self-end" />
          </div>

          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[1.6fr_1fr_1fr_1fr_0.7fr] gap-4 items-center px-5 py-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-52" />
                </div>
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-7 w-7 rounded-lg justify-self-end" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
