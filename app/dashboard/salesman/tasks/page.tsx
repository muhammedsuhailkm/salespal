import { getSalesPalSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { SalesmanTasksList } from "@/components/tasks/SalesmanTasksList";

export default async function SalesmanTasksPage() {
  const session = await getSalesPalSession();
  const userId = session!.user.id;

  // 1. Tasks created by me in the status in process
  const myInProcessTasks = await prisma.task.findMany({
    where: {
      created_by_id: userId,
      status: "in_process",
    },
    include: {
      assignedTo: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { due_date: "asc" },
  });

  // 2. Tasks assigned to me by the manager
  const managerAssignedTasks = await prisma.task.findMany({
    where: {
      assigned_to_id: userId,
      created_by_id: { not: userId },
    },
    include: {
      assignedTo: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { due_date: "asc" },
  });

  return (
    <>
      <PageHeader title="My Tasks" subtitle="Manage your tasks and updates here." />
      <div className="mt-4">
        <SalesmanTasksList
          myInProcessTasks={myInProcessTasks}
          managerAssignedTasks={managerAssignedTasks}
        />
      </div>
    </>
  );
}
