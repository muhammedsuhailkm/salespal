import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ClientTable } from "@/components/clients/ClientTable";
import { Skeleton } from "@/components/ui/Skeleton";
import { getClientsPage } from "@/lib/clients-list";
import type { SearchParams } from "@/lib/list-params";
import {
  getCachedAdminOrgs,
  getCachedAdminManagersList,
  getCachedAdminRelationsList,
} from "@/lib/cached-queries";

async function ClientTableContainer({ searchParams }: { searchParams: SearchParams }) {
  const [clients, companies, managers, managerSalesmen] = await Promise.all([
    getClientsPage({}, searchParams),
    getCachedAdminOrgs(),
    getCachedAdminManagersList(),
    getCachedAdminRelationsList(),
  ]);

  return (
    <ClientTable
      clients={clients.rows}
      total={clients.total}
      page={clients.page}
      pageSize={clients.pageSize}
      companies={companies}
      managers={managers}
      managerSalesmen={managerSalesmen}
    />
  );
}

function ClientsTableSkeleton() {
  return (
    <div className="space-y-4 animate-page-in">
      {/* Toolbar skeleton */}
      <div className="flex flex-col gap-4 bg-card p-4 rounded-card border border-border/80 shadow-card">
        <Skeleton className="h-10 w-full rounded-md" />
        <div className="flex gap-4 border-t border-border/70 pt-3.5">
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>

      {/* Table skeleton */}
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

export default async function AdminClientsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  return (
    <>
      <PageHeader title="Client database" subtitle="Read-only view of all logistics prospects and customers." />
      <Suspense fallback={<ClientsTableSkeleton />}>
        <ClientTableContainer searchParams={params} />
      </Suspense>
    </>
  );
}
