import { getSalesPalSession } from "@/lib/auth";
import { getEnquiriesPage } from "@/lib/enquiries";
import type { SearchParams } from "@/lib/list-params";
import { PageHeader } from "@/components/layout/PageHeader";
import { EnquiriesClient } from "@/components/enquiries/EnquiriesClient";
import { AccountantCompanyChips, NoAssignedCompanies } from "@/components/accountant/AccountantCompanies";
import { getAccountantCompanies } from "@/lib/accountant-dashboard";

export default async function AccountantEnquiriesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [params, session] = await Promise.all([searchParams, getSalesPalSession()]);
  const user = { ...session!.user, id: Number(session!.user.id) };
  const [data, companies] = await Promise.all([getEnquiriesPage(user, params), getAccountantCompanies(user.id)]);

  return (
    <>
      <PageHeader
        title="Enquiries"
        subtitle="Convert confirmed enquiries into orders with actual cost, profit and job no."
        action={<AccountantCompanyChips companies={companies} />}
      />
      {companies.length === 0 ? (
        <NoAssignedCompanies />
      ) : (
        <EnquiriesClient data={data} role="accountant" canCreate={false} />
      )}
    </>
  );
}
