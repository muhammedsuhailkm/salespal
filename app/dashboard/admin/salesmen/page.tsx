import { getSalesPalSession } from "@/lib/auth";
import { getSalesmenWithTargets } from "@/lib/salesman-targets";
import { PageHeader } from "@/components/layout/PageHeader";
import { SalesmenTargetsClient } from "@/components/salesmen/SalesmenTargetsClient";

export default async function AdminSalesmenPage() {
  const session = await getSalesPalSession();
  const salesmen = await getSalesmenWithTargets({ id: Number(session!.user.id), role_id: 1 });

  return (
    <>
      <PageHeader title="Salesmen" subtitle="Targets assigned by managers and each salesman's progress." />
      <SalesmenTargetsClient salesmen={salesmen} canAssign={false} />
    </>
  );
}
