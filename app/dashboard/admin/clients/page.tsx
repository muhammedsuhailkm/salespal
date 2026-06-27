import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ClientTable } from "@/components/clients/ClientTable";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  getCachedAdminClientsList,
  getCachedAdminOrgs,
  getCachedAdminManagersList,
  getCachedAdminRelationsList,
} from "@/lib/cached-queries";

async function ClientTableContainer() {
  const [clients, companies, managers, managerSalesmen] = await Promise.all([
    getCachedAdminClientsList(),
    getCachedAdminOrgs(),
    getCachedAdminManagersList(),
    getCachedAdminRelationsList(),
  ]);

  return (
    <ClientTable
      clients={clients}
      companies={companies}
      managers={managers}
      managerSalesmen={managerSalesmen}
    />
  );
}

function ClientsTableSkeleton() {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Toolbar skeleton */}
      <div className="flex flex-col gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        <Skeleton className="h-10 w-full rounded-md" />
        <div className="flex gap-4 border-t border-slate-100/70 pt-3.5">
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100/50 last:border-0">
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

export default async function AdminClientsPage() {
  return (
    <>
      <PageHeader title="Client database" subtitle="Read-only view of all logistics prospects and customers." />
      <Suspense fallback={<ClientsTableSkeleton />}>
        <ClientTableContainer />
      </Suspense>
    </>
  );
}
