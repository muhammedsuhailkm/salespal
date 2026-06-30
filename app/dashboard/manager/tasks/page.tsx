import { Suspense } from "react";
import { getSalesPalSession } from "@/lib/auth";
import { getCachedManagerTasksPageData } from "@/lib/cached-queries";
import { PageHeader } from "@/components/layout/PageHeader";
import { ManagerTasksList } from "@/components/tasks/ManagerTasksList";
import { Skeleton } from "@/components/ui/Skeleton";

export default function ManagerTasksPage() {
  return (
    <>
      <PageHeader
        title="Team Tasks"
        subtitle="Assign, manage, and monitor task progress for your salesmen."
      />
      <div className="mt-4">
        <Suspense fallback={<ManagerTasksSkeleton />}>
          <ManagerTasksSection />
        </Suspense>
      </div>
    </>
  );
}

async function ManagerTasksSection() {
  const session = await getSalesPalSession();
  const managerId = session!.user.id;
  const { salesmen, clients, tasks } = await getCachedManagerTasksPageData(managerId);

  return (
    <ManagerTasksList
      initialTasks={tasks}
      salesmen={salesmen}
      clients={clients}
    />
  );
}

function ManagerTasksSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-64" />
        </div>
        <Skeleton className="h-8 w-24 rounded-xl" />
      </div>

      <div className="max-w-2xl mx-auto space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-5 w-3/4" />
            <div className="border-t border-slate-50 pt-2.5 flex items-center justify-between">
              <Skeleton className="h-3.5 w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
