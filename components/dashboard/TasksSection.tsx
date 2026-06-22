import { getSalesPalSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TaskOverview } from "@/components/dashboard/TaskOverview";
import { Skeleton } from "@/components/ui/Skeleton";

export async function TasksSection() {
  const session = await getSalesPalSession();
  const userId = session!.user.id;

  const tasks = await prisma.task.findMany({
    where: { assigned_to_id: userId },
    include: { assignedTo: { select: { name: true } } },
    orderBy: { due_date: "asc" },
    take: 5,
  });

  return <TaskOverview tasks={tasks} />;
}

export function TasksSkeleton() {
  return (
    <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-4 p-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}
