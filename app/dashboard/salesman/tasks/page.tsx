import { getSalesPalSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { AddTaskModal } from "@/components/tasks/AddTaskModal";
import { TaskList } from "@/components/tasks/TaskList";

export default async function SalesmanTasksPage() {
  const session = await getSalesPalSession();
  const tasks = await prisma.task.findMany({ where: { assigned_to_id: session!.user.id }, include: { assignedTo: { select: { name: true } }, createdBy: { select: { name: true } } }, orderBy: { due_date: "asc" } });
  return <><PageHeader title="My tasks" subtitle="Tasks assigned to you with due dates and status." action={<AddTaskModal />} /><TaskList tasks={tasks} /></>;
}
