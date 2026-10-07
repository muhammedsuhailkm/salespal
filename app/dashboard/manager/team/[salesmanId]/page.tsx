import { notFound } from "next/navigation";
import { canAccessSalesman } from "@/lib/scoping";
import { getSalesPalSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateKpiScore } from "@/lib/kpi";
import { clientStatusCounts, getClientsPage } from "@/lib/clients-list";
import type { SearchParams } from "@/lib/list-params";
import { PageHeader } from "@/components/layout/PageHeader";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ClientTable } from "@/components/clients/ClientTable";
import { PerformanceReportButton } from "@/components/reports/PerformanceReportButton";

export default async function SalesmanDrilldownPage({
  params,
  searchParams,
}: {
  params: Promise<{ salesmanId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ salesmanId }, query, session] = await Promise.all([params, searchParams, getSalesPalSession()]);
  const id = Number(salesmanId);
  if (!(await canAccessSalesman({ id: session!.user.id, role_id: session!.user.role_id }, id))) notFound();

  const scope = { assigned_salesman_id: id };
  const [salesman, counts, clients] = await Promise.all([
    prisma.user.findUnique({ where: { id }, select: { name: true } }),
    clientStatusCounts(scope),
    getClientsPage(scope, query),
  ]);
  if (!salesman) notFound();
  const totalClients = Object.values(counts).reduce((sum, n) => sum + n, 0);

  return (
    <>
      <PageHeader
        title={salesman.name}
        subtitle="Salesman client status and KPI drilldown."
        action={<PerformanceReportButton salesmanId={id} salesmanName={salesman.name} />}
      />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <KpiCard label="KPI score" value={calculateKpiScore(counts)} />
        <KpiCard label="Clients" value={totalClients} />
        <KpiCard label="Onboarded" value={counts.onboarded ?? 0} />
      </div>
      <ClientTable clients={clients.rows} total={clients.total} page={clients.page} pageSize={clients.pageSize} />
    </>
  );
}
