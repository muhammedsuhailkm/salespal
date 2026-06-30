import { getSalesPalSession } from "@/lib/auth";
import { getManagerSalesmanIds } from "@/lib/scoping";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { ManagerTeamClient } from "./ManagerTeamClient";

export default async function TeamPage() {
  const session = await getSalesPalSession();
  const salesmanIds = await getManagerSalesmanIds(session!.user.id);

  const salesmen = await prisma.user.findMany({
    where: { id: { in: salesmanIds } },
    include: {
      assignedClients: {
        select: { status: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <PageHeader title="Team" subtitle="Salesmen assigned to you." />
      <ManagerTeamClient initialSalesmen={salesmen} />
    </>
  );
}
