import { Suspense } from "react";
import { getSalesPalSession } from "@/lib/auth";
import { getManagerSalesmanIds } from "@/lib/scoping";
import { prisma } from "@/lib/prisma";
import { ClientOverview } from "@/app/dashboard/salesman/clients/[id]/ClientOverview";
import ClientOverviewLoading from "@/app/dashboard/salesman/clients/[id]/loading";
import { redirect } from "next/navigation";

export default async function ManagerClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<ClientOverviewLoading />}>
      <ClientDetailContent params={params} />
    </Suspense>
  );
}

async function ClientDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const clientId = Number(id);

  if (isNaN(clientId)) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-sm font-bold text-red-600">Invalid Client ID</h3>
        <p className="mt-2 text-xs text-slate-500">
          The client ID provided is not valid.
        </p>
      </div>
    );
  }

  const session = await getSalesPalSession();
  if (!session) redirect("/login");

  const managerId = session.user.id;
  const salesmanIds = await getManagerSalesmanIds(managerId);

  const client = await prisma.client.findFirst({
    where: { id: clientId, assigned_salesman_id: { in: salesmanIds } },
    include: {
      logs: {
        include: { author: { select: { name: true } } },
        orderBy: { created_at: "desc" },
        take: 50,
      },
      organization: true,
      assignedSalesman: { select: { name: true } },
    },
  });

  if (!client) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-sm font-bold text-red-600">
          Client Not Found
        </h3>
        <p className="mt-2 text-xs text-slate-500">
          This client does not exist or you do not have access to it.
        </p>
      </div>
    );
  }

  const tasks = await prisma.clientTask.findMany({
    where: { client_id: clientId },
    include: {
      assignedTo: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { due_date: "asc" },
  });

  return (
    <ClientOverview
      client={client}
      initialTasks={tasks}
      backLink="/dashboard/manager/clients"
    />
  );
}
