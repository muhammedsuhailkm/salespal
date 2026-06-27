import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { ClientTable } from "@/components/clients/ClientTable";

export default async function AdminClientsPage() {
  const [clients, companies, managers, managerSalesmen] = await Promise.all([
    prisma.client.findMany({
      include: {
        organization: { select: { id: true, name: true } },
        assignedSalesman: { select: { name: true } }
      },
      orderBy: { id: "desc" }
    }),
    prisma.organization.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    }),
    prisma.user.findMany({
      where: { role_id: 2 },
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    }),
    prisma.managerSalesman.findMany({
      select: { manager_id: true, salesman_id: true }
    })
  ]);

  return (
    <>
      <PageHeader title="Client database" subtitle="Read-only view of all logistics prospects and customers." />
      <ClientTable
        clients={clients}
        companies={companies}
        managers={managers}
        managerSalesmen={managerSalesmen}
      />
    </>
  );
}
