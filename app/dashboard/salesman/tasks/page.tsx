import { Suspense } from "react";
import { getSalesPalSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { SalesmanTasksList } from "@/components/tasks/SalesmanTasksList";
import { Skeleton } from "@/components/ui/Skeleton";

export default async function SalesmanTasksPage() {
  return (
    <>
      <PageHeader title="My Tasks" subtitle="Manage your tasks and updates here." />
      <div className="mt-4">
        <Suspense fallback={<TasksListSkeleton />}>
          <TasksListSection />
        </Suspense>
      </div>
    </>
  );
}

async function TasksListSection() {
  const session = await getSalesPalSession();
  const userId = session!.user.id;

  // Parallelize the queries on the server
  const [myInProcessTasks, managerAssignedTasks] = await Promise.all([
    prisma.task.findMany({
      where: {
        created_by_id: userId,
      },
      include: {
        assignedTo: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { due_date: "asc" },
    }),
    prisma.task.findMany({
      where: {
        assigned_to_id: userId,
        created_by_id: { not: userId },
      },
      include: {
        assignedTo: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { due_date: "asc" },
    }),
  ]);

  return (
    <SalesmanTasksList
      myInProcessTasks={myInProcessTasks}
      managerAssignedTasks={managerAssignedTasks}
    />
  );
}

function TasksListSkeleton() {
  return (
    <div className="space-y-6">
      {/* Mock Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm animate-pulse">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-64" />
        </div>
        <Skeleton className="h-8 w-24 rounded-xl" />
      </div>

      {/* Mock Task Cards */}
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
