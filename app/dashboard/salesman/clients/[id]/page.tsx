import { Suspense } from "react";
import { getSalesPalSession } from "@/lib/auth";
import { getCachedClientDetail } from "@/lib/cached-queries";
import { ClientOverview } from "./ClientOverview";
import ClientOverviewLoading from "./loading";
import { redirect } from "next/navigation";

export default async function ClientDetailPage({
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

  const userId = session.user.id;
  const { client, tasks } = await getCachedClientDetail(clientId, userId);

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

  return <ClientOverview client={client} initialTasks={tasks} />;
}
