import { Suspense } from "react";
import { getSalesPalSession } from "@/lib/auth";
import { getCachedClientDetail } from "@/lib/cached-queries";
import { getClientHistory } from "@/lib/client-history";
import { ClientHistory } from "@/components/clients/ClientHistory";
import { ClientHistorySkeleton } from "@/components/clients/ClientHistorySkeleton";
import { ClientDocumentsCard } from "@/components/clients/ClientDocumentsCard";
import { getClientDocuments } from "@/lib/client-documents";
import { ClientOverview } from "./ClientOverview";
import ClientOverviewLoading from "./loading";
import { redirect } from "next/navigation";

type SearchParams = Promise<{ o_page?: string; e_page?: string }>;

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  return (
    <Suspense fallback={<ClientOverviewLoading />}>
      <ClientDetailContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function ClientDetailContent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const clientId = Number(id);

  if (isNaN(clientId)) {
    return (
      <div className="p-8 text-center bg-card rounded-card shadow-card border border-border">
        <h3 className="text-sm font-semibold text-danger-foreground">Invalid Client ID</h3>
        <p className="mt-2 text-xs text-muted-foreground">
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
      <div className="p-8 text-center bg-card rounded-card shadow-card border border-border">
        <h3 className="text-sm font-semibold text-danger-foreground">
          Client Not Found
        </h3>
        <p className="mt-2 text-xs text-muted-foreground">
          This client does not exist or you do not have access to it.
        </p>
      </div>
    );
  }

  return (
    <ClientOverview
      client={client}
      initialTasks={tasks}
      documents={
        <ClientDocumentsCard
          clientId={clientId}
          documents={await getClientDocuments(clientId)}
          currentUser={{ id: Number(session.user.id), role_id: session.user.role_id }}
        />
      }
      history={
        <Suspense fallback={<ClientHistorySkeleton />}>
          <HistorySection clientId={clientId} searchParams={searchParams} />
        </Suspense>
      }
    />
  );
}

async function HistorySection({ clientId, searchParams }: { clientId: number; searchParams: SearchParams }) {
  const data = await getClientHistory(clientId, await searchParams);
  return <ClientHistory data={data} role="salesman" />;
}
