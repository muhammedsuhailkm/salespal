import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { ClientTable } from "@/components/clients/ClientTable";

export default async function AdminClientsPage() {
  const clients = await prisma.client.findMany({ include: { organization: { select: { name: true } }, assignedSalesman: { select: { name: true } } }, orderBy: { id: "desc" } });
  return <><PageHeader title="Client database" subtitle="Read-only view of all logistics prospects and customers." /><ClientTable clients={clients} /></>;
}
