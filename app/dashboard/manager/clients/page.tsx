import { getSalesPalSession } from "@/lib/auth";
import { getManagerSalesmanIds } from "@/lib/scoping";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { ManagerClientsList } from "./ManagerClientsList";

export default async function ManagerClientsPage() {
  const session = await getSalesPalSession();
  const managerId = session!.user.id;

  const salesmanIds = await getManagerSalesmanIds(managerId);

  const [salesmen, clients] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: salesmanIds } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.client.findMany({
      where: { assigned_salesman_id: { in: salesmanIds } },
      include: {
        organization: { select: { name: true } },
        assignedSalesman: { select: { name: true } }
      },
      orderBy: { id: "desc" }
    })
  ]);

  return (
    <>
      <PageHeader
        title="Organization Clients"
        subtitle="Manage and monitor clients under your assigned sales team."
      />
      <ManagerClientsList initialClients={clients} salesmen={salesmen} />
    </>
  );
}
