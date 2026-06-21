import { getSalesPalSession } from "@/lib/auth";
import { getManagerOrgIds } from "@/lib/scoping";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { ClientTable } from "@/components/clients/ClientTable";

export default async function ManagerClientsPage() {
  const session = await getSalesPalSession();
  const orgIds = await getManagerOrgIds(session!.user.id);
  const clients = await prisma.client.findMany({ where: { org_id: { in: orgIds } }, include: { organization: { select: { name: true } }, assignedSalesman: { select: { name: true } } }, orderBy: { id: "desc" } });
  return <><PageHeader title="Organization clients" subtitle="Clients scoped to your assigned company." /><ClientTable clients={clients} /></>;
}
