import { Suspense } from "react";
import { getSalesPalSession } from "@/lib/auth";
import { getClientsPage } from "@/lib/clients-list";
import { prisma } from "@/lib/prisma";
import { getSalesmanOrgIds } from "@/lib/scoping";
import type { SearchParams } from "@/lib/list-params";
import { PageHeader } from "@/components/layout/PageHeader";
import { SalesmanClientsList } from "./SalesmanClientsList";
import { Skeleton } from "@/components/ui/Skeleton";

export default async function SalesmanClientsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  return (
    <>
      <PageHeader title="My Clients" />
      <Suspense fallback={<ClientsTableSkeleton />}>
        <ClientsListSection params={params} />
      </Suspense>
    </>
  );
}

async function ClientsListSection({ params }: { params: SearchParams }) {
  const session = await getSalesPalSession();
  const salesmanId = Number(session!.user.id);
  const [clients, companies] = await Promise.all([
    getClientsPage({ assigned_salesman_id: salesmanId }, params),
    // Companies this salesman was given; new clients go under one of them.
    getSalesmanOrgIds(salesmanId).then((ids) =>
      prisma.organization.findMany({ where: { id: { in: ids } }, select: { id: true, name: true }, orderBy: { name: "asc" } })
    ),
  ]);

  return (
    <SalesmanClientsList initialClients={clients.rows} total={clients.total} page={clients.page} pageSize={clients.pageSize} companies={companies} />
  );
}

function ClientsTableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Mock Toolbar */}
      <div className="flex flex-col gap-4 bg-card p-4 rounded-card border border-border/80 shadow-card animate-pulse">
        <div className="h-10 bg-subtle/50 rounded-md" />
        <div className="flex gap-4 border-t border-border/70 pt-3.5">
          <div className="h-10 w-32 bg-subtle/50 rounded-lg" />
          <div className="h-10 w-32 bg-subtle/50 rounded-lg" />
        </div>
      </div>
      {/* Mock Table */}
      <div className="overflow-x-auto rounded-card border border-border bg-card shadow-card">
        <div className="p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-3 w-1/5" />
              </div>
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-1/5" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
