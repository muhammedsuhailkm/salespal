import { getSalesPalSession } from "@/lib/auth";
import { getManagerSalesmanIds } from "@/lib/scoping";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { AddTaskModal } from "@/components/tasks/AddTaskModal";
import { TaskList } from "@/components/tasks/TaskList";

export default async function ManagerTasksPage() {
  const session = await getSalesPalSession();
  const salesmanIds = await getManagerSalesmanIds(session!.user.id);
  const tasks = await prisma.task.findMany({ where: { assigned_to_id: { in: salesmanIds } }, include: { assignedTo: { select: { name: true } }, createdBy: { select: { name: true } } }, orderBy: { due_date: "asc" } });
  return <><PageHeader title="Team tasks" subtitle="Assign and monitor task progress for your salesmen." action={<AddTaskModal />} /><TaskList tasks={tasks} /></>;
}
