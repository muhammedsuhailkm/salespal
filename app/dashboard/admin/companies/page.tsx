import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";

export default async function CompaniesPage() {
  const companies = await prisma.organization.findMany({ include: { clients: true, managers: { include: { manager: true } } } });
  return <><PageHeader title="Companies" subtitle="Company A and Company B with live client coverage." /><div className="grid gap-4 md:grid-cols-2">{companies.map((company) => <Card key={company.id}><h2 className="text-lg font-semibold">{company.name}</h2><p className="mt-2 text-sm text-slate-500">{company.clients.length} clients tracked</p><p className="mt-1 text-sm text-slate-500">Manager: {company.managers[0]?.manager.name ?? "Unassigned"}</p></Card>)}</div></>;
}
