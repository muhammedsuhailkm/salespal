import { Suspense } from "react";
import { getSalesPalSession } from "@/lib/auth";
import { getTasksPage } from "@/lib/tasks-list";
import { prisma } from "@/lib/prisma";
import type { SearchParams } from "@/lib/list-params";
import { PageHeader } from "@/components/layout/PageHeader";
import { ManagerTasksList } from "@/components/tasks/ManagerTasksList";
import { Skeleton } from "@/components/ui/Skeleton";

export default async function ManagerTasksPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  return (
    <>
      <PageHeader
        title="Team Tasks"
        subtitle="Assign, manage, and monitor task progress for your salesmen."
      />
      <div className="mt-4">
        <Suspense fallback={<ManagerTasksSkeleton />}>
          <ManagerTasksSection params={params} />
        </Suspense>
      </div>
    </>
  );
}

async function ManagerTasksSection({ params }: { params: SearchParams }) {
  const session = await getSalesPalSession();
  const managerId = Number(session!.user.id);
  const salesmen = await prisma.user.findMany({
    where: { salesmanManager: { some: { manager_id: managerId } } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const data = await getTasksPage({ assignedTo: salesmen.map((s) => s.id) }, params);

  return <ManagerTasksList data={data} salesmen={salesmen} />;
}

function ManagerTasksSkeleton() {
  return (
    <div className="space-y-6 animate-page-in">
      <div className="bg-card p-5 rounded-card border border-border/80 shadow-card space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-72" />
          </div>
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>

        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </div>

      <div className="w-full space-y-4">
        <div className="flex items-center gap-1.5 bg-muted p-1 rounded-xl w-fit">
          <Skeleton className="h-7 w-20 rounded-lg" />
          <Skeleton className="h-7 w-16 rounded-lg" />
          <Skeleton className="h-7 w-24 rounded-lg" />
        </div>

        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-card border border-border bg-card p-4 shadow-card"
          >
            <div className="flex-1 space-y-3 min-w-0">
              <div className="flex items-center flex-wrap gap-2">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-5 w-28 rounded-full" />
                <Skeleton className="h-5 w-36 rounded-full" />
              </div>
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-7/12" />
              <Skeleton className="h-3.5 w-32 rounded-full" />
            </div>
            <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
              <Skeleton className="h-7 w-28 rounded-full" />
              <Skeleton className="h-7 w-7 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
