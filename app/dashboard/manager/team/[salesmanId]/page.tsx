import { notFound } from "next/navigation";
import { canAccessSalesman } from "@/lib/scoping";
import { getSalesPalSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateKpiScore, groupStatusCounts } from "@/lib/kpi";
import { PageHeader } from "@/components/layout/PageHeader";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ClientTable } from "@/components/clients/ClientTable";

export default async function SalesmanDrilldownPage({ params }: { params: Promise<{ salesmanId: string }> }) {
  const { salesmanId } = await params;
  const session = await getSalesPalSession();
  const id = Number(salesmanId);
  if (!(await canAccessSalesman({ id: session!.user.id, role_id: session!.user.role_id }, id))) notFound();
  const salesman = await prisma.user.findUnique({ where: { id }, include: { assignedClients: { include: { organization: { select: { name: true } }, assignedSalesman: { select: { name: true } } } } } });
  if (!salesman) notFound();
  const counts = groupStatusCounts(salesman.assignedClients);
  return <><PageHeader title={salesman.name} subtitle="Salesman client status and KPI drilldown." /><div className="mb-6 grid gap-4 md:grid-cols-3"><KpiCard label="KPI score" value={calculateKpiScore(counts)} /><KpiCard label="Clients" value={salesman.assignedClients.length} /><KpiCard label="Onboarded" value={counts.onboarded ?? 0} /></div><ClientTable clients={salesman.assignedClients} /></>;
}
