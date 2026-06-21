import { getSalesPalSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { ClientTable } from "@/components/clients/ClientTable";

export default async function SalesmanClientsPage() {
  const session = await getSalesPalSession();
  const clients = await prisma.client.findMany({ where: { assigned_salesman_id: session!.user.id }, include: { organization: { select: { name: true } }, assignedSalesman: { select: { name: true } } }, orderBy: { id: "desc" } });
  return <><PageHeader title="My clients" subtitle="Search, status updates, and lead follow-up live here." /><ClientTable clients={clients} /></>;
}
