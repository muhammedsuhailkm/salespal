import { getSalesPalSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { SalesmanClientsList } from "./SalesmanClientsList";

export default async function SalesmanClientsPage() {
  const session = await getSalesPalSession();
  const clients = await prisma.client.findMany({
    where: { assigned_salesman_id: session!.user.id },
    include: {
      organization: { select: { name: true } }
    },
    orderBy: { id: "desc" }
  });

  return (
    <>
      <PageHeader title="My Clients" subtitle="Search, status updates, and lead follow-up live here." />
      <SalesmanClientsList initialClients={clients} />
    </>
  );
}
