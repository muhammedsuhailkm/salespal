import { getSalesPalSession } from "@/lib/auth";
import { getManagerSalesmanIds, getManagerOrgIds } from "@/lib/scoping";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { ManagerTasksList } from "@/components/tasks/ManagerTasksList";

export default async function ManagerTasksPage() {
  const session = await getSalesPalSession();
  const managerId = session!.user.id;

  // Retrieve assigned salesman IDs and manager organization IDs
  const [salesmanIds, orgIds] = await Promise.all([
    getManagerSalesmanIds(managerId),
    getManagerOrgIds(managerId),
  ]);

  // Fetch all necessary data parallel
  const [salesmen, clients, regularTasks, clientTasks] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: salesmanIds } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.client.findMany({
      where: { org_id: { in: orgIds } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.task.findMany({
      where: { assigned_to_id: { in: salesmanIds } },
      include: {
        assignedTo: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { due_date: "asc" },
    }),
    prisma.clientTask.findMany({
      where: { assigned_to_id: { in: salesmanIds } },
      include: {
        assignedTo: { select: { name: true } },
        createdBy: { select: { name: true } },
        client: { select: { id: true, name: true } },
      },
      orderBy: { due_date: "asc" },
    }),
  ]);

  // Map regular tasks to the unified format
  const mappedRegularTasks = regularTasks.map((t) => ({
    ...t,
    isClientTask: false,
    clientId: null,
    clientName: null,
  }));

  // Map client tasks to the unified format
  const mappedClientTasks = clientTasks.map((ct) => ({
    ...ct,
    isClientTask: true,
    clientId: ct.client_id,
    clientName: ct.client.name,
  }));

  // Combine and sort by due date ascending
  const unifiedTasks = [...mappedRegularTasks, ...mappedClientTasks].sort(
    (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  );

  return (
    <>
      <PageHeader
        title="Team Tasks"
        subtitle="Assign, manage, and monitor task progress for your salesmen."
      />
      <ManagerTasksList
        initialTasks={unifiedTasks}
        salesmen={salesmen}
        clients={clients}
      />
    </>
  );
}
