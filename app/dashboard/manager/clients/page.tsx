import { Suspense } from "react";
import { getSalesPalSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientsPage } from "@/lib/clients-list";
import type { SearchParams } from "@/lib/list-params";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { ManagerClientsList } from "./ManagerClientsList";

export default async function ManagerClientsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  return (
    <>
      <PageHeader
        title="Organization Clients"
        subtitle="Manage and monitor clients under your assigned sales team."
      />
      <Suspense fallback={<ClientsTableSkeleton />}>
        <ManagerClientsSection params={params} />
      </Suspense>
    </>
  );
}

async function ManagerClientsSection({ params }: { params: SearchParams }) {
  const session = await getSalesPalSession();
  const managerId = Number(session!.user.id);
  const team = await prisma.user.findMany({
    where: { salesmanManager: { some: { manager_id: managerId } } },
    // Which of this manager's companies each salesman works for.
    select: { id: true, name: true, salesmanManager: { where: { manager_id: managerId }, select: { org_id: true } } },
    orderBy: { name: "asc" },
  });
  const salesmen = team.map((s) => ({ id: s.id, name: s.name, org_ids: s.salesmanManager.map((l) => l.org_id) }));
  // Same scope as before: clients assigned to this manager's salesmen.
  const [clients, managerOrgs] = await Promise.all([
    getClientsPage({ assigned_salesman_id: { in: salesmen.map((s) => s.id) } }, params),
    prisma.managerOrg.findMany({
      where: { manager_id: Number(session!.user.id) },
      select: { org: { select: { id: true, name: true } } },
      orderBy: { org: { name: "asc" } },
    }),
  ]);

  return (
    <ManagerClientsList
      initialClients={clients.rows}
      total={clients.total}
      page={clients.page}
      pageSize={clients.pageSize}
      salesmen={salesmen}
      companies={managerOrgs.map((item) => item.org)}
    />
  );
}

function ClientsTableSkeleton() {
  return (
    <div className="space-y-4 animate-page-in">
      <div className="flex items-center justify-between bg-subtle/50 p-4 rounded-xl border border-border/60 shadow-sm flex-wrap gap-3">
        <Skeleton className="h-5 w-44" />
      </div>

      <div className="flex flex-col gap-4 bg-card p-4 rounded-card border border-border/80 shadow-card">
        <Skeleton className="h-10 w-full rounded-md" />
        <div className="flex flex-wrap items-end gap-4 border-t border-border/70 pt-3.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5 min-w-[140px]">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-10 w-36 rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-card border border-border bg-card shadow-card">
        <div className="min-w-[980px]">
          <div className="grid grid-cols-[1.3fr_1fr_1fr_1fr_0.9fr_0.9fr_0.8fr] gap-4 bg-muted px-4 py-3 border-b border-border">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3.5 w-18" />
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-18" />
            <Skeleton className="h-3.5 w-16" />
          </div>

          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[1.3fr_1fr_1fr_1fr_0.9fr_0.9fr_0.8fr] gap-4 items-center px-4 py-3">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-24 rounded-lg" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
