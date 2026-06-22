import { Suspense } from "react";
import { getSalesPalSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { SalesmanClientsList } from "./SalesmanClientsList";
import { Skeleton } from "@/components/ui/Skeleton";

export default async function SalesmanClientsPage() {
  return (
    <>
      <PageHeader title="My Clients" subtitle="Search, status updates, and lead follow-up live here." />
      <Suspense fallback={<ClientsTableSkeleton />}>
        <ClientsListSection />
      </Suspense>
    </>
  );
}

async function ClientsListSection() {
  const session = await getSalesPalSession();
  const userId = session!.user.id;

  const clients = await prisma.client.findMany({
    where: { assigned_salesman_id: userId },
    include: {
      organization: { select: { name: true } }
    },
    orderBy: { id: "desc" }
  });

  return <SalesmanClientsList initialClients={clients} />;
}

function ClientsTableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Mock Toolbar */}
      <div className="flex flex-col gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm animate-pulse">
        <div className="h-10 bg-slate-50/50 rounded-md" />
        <div className="flex gap-4 border-t border-slate-100/70 pt-3.5">
          <div className="h-10 w-32 bg-slate-50/50 rounded-lg" />
          <div className="h-10 w-32 bg-slate-50/50 rounded-lg" />
        </div>
      </div>
      {/* Mock Table */}
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
