import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getSalesPalSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientScopeWhere } from "@/lib/scoping";
import { ClientOverview } from "./ClientOverview";
import ClientOverviewLoading from "./loading";

async function ClientOverviewContent({ id }: { id: string }) {
  const session = await getSalesPalSession();
  if (!session) return notFound();

  const clientId = Number(id);
  const scopeWhere = await clientScopeWhere(session.user);

  // Run both queries in parallel
  const [client, tasks] = await Promise.all([
    prisma.client.findFirst({
      where: {
        AND: [
          { id: clientId },
          scopeWhere
        ]
      },
      include: {
        organization: { select: { name: true } },
        assignedSalesman: { select: { name: true } }
      }
    }),
    prisma.clientTask.findMany({
      where: { client_id: clientId },
      include: {
        assignedTo: { select: { name: true } },
        createdBy: { select: { name: true } }
      },
      orderBy: { due_date: "asc" }
    })
  ]);

  if (!client) {
    notFound();
  }

  return <ClientOverview client={client} initialTasks={tasks} />;
}

export default async function ClientDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  return (
    <Suspense fallback={<ClientOverviewLoading />}>
      <ClientOverviewContent id={id} />
    </Suspense>
  );
}
