import { Suspense } from "react";
import { getSalesPalSession } from "@/lib/auth";
import { getCachedManagerClientsPageData } from "@/lib/cached-queries";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { ManagerClientsList } from "./ManagerClientsList";

export default function ManagerClientsPage() {
  return (
    <>
      <PageHeader
        title="Organization Clients"
        subtitle="Manage and monitor clients under your assigned sales team."
      />
      <Suspense fallback={<ClientsTableSkeleton />}>
        <ManagerClientsSection />
      </Suspense>
    </>
  );
}

async function ManagerClientsSection() {
  const session = await getSalesPalSession();
  const { salesmen, clients } = await getCachedManagerClientsPageData(session!.user.id);

  return <ManagerClientsList initialClients={clients} salesmen={salesmen} />;
}

function ClientsTableSkeleton() {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 shadow-sm flex-wrap gap-3">
        <Skeleton className="h-5 w-44" />
      </div>

      <div className="flex flex-col gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        <Skeleton className="h-10 w-full rounded-md" />
        <div className="flex flex-wrap items-end gap-4 border-t border-slate-100/70 pt-3.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5 min-w-[140px]">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-10 w-36 rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="min-w-[980px]">
          <div className="grid grid-cols-[1.3fr_1fr_1fr_1fr_0.9fr_0.9fr_0.8fr] gap-4 bg-slate-100 px-4 py-3 border-b border-slate-200">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3.5 w-18" />
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-18" />
            <Skeleton className="h-3.5 w-16" />
          </div>

          <div className="divide-y divide-slate-200">
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
