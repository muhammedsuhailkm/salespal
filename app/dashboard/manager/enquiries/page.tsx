import { getSalesPalSession } from "@/lib/auth";
import { getEnquiriesPage } from "@/lib/enquiries";
import type { SearchParams } from "@/lib/list-params";
import { PageHeader } from "@/components/layout/PageHeader";
import { EnquiriesClient } from "@/components/enquiries/EnquiriesClient";

export default async function ManagerEnquiriesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [params, session] = await Promise.all([searchParams, getSalesPalSession()]);
  const data = await getEnquiriesPage({ ...session!.user, id: Number(session!.user.id) }, params);

  return (
    <>
      <PageHeader title="Enquiries" subtitle="Enquiries from you and your team, from quote to order." />
      <EnquiriesClient data={data} role="manager" canCreate canFollowUp />
    </>
  );
}
