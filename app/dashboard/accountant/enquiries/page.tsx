import { getSalesPalSession } from "@/lib/auth";
import { getEnquiries, getEnquiryClientOptions } from "@/lib/enquiries";
import { PageHeader } from "@/components/layout/PageHeader";
import { EnquiriesClient } from "@/components/enquiries/EnquiriesClient";

export default async function AccountantEnquiriesPage() {
  const session = await getSalesPalSession();
  const user = { ...session!.user, id: Number(session!.user.id) };
  const [enquiries, clients] = await Promise.all([getEnquiries(user), Promise.resolve([])]);

  return (
    <>
      <PageHeader title="Enquiries" subtitle="Convert confirmed enquiries into orders with actual cost, profit and job no." />
      <EnquiriesClient enquiries={enquiries} clients={clients} canCreate={false} canConvert={true} />
    </>
  );
}
