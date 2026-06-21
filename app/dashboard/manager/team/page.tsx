import Link from "next/link";
import { getSalesPalSession } from "@/lib/auth";
import { getManagerSalesmanIds } from "@/lib/scoping";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { SalesmanPerfTable } from "@/components/dashboard/SalesmanPerfTable";

export default async function TeamPage() {
  const session = await getSalesPalSession();
  const salesmanIds = await getManagerSalesmanIds(session!.user.id);
  const salesmen = await prisma.user.findMany({ where: { id: { in: salesmanIds } }, include: { assignedClients: { select: { status: true } } } });
  return <><PageHeader title="Team" subtitle="Salesmen assigned to you." /><SalesmanPerfTable salesmen={salesmen} /><div className="mt-4 flex gap-2">{salesmen.map((salesman) => <Link className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" href={`/dashboard/manager/team/${salesman.id}`} key={salesman.id}>{salesman.name}</Link>)}</div></>;
}
