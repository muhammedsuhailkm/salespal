import { getSalesPalSession } from "@/lib/auth";
import { getEnquiries, getEnquiryClientOptions } from "@/lib/enquiries";
import { PageHeader } from "@/components/layout/PageHeader";
import { EnquiriesClient } from "@/components/enquiries/EnquiriesClient";

export default async function SalesmanEnquiriesPage() {
  const session = await getSalesPalSession();
  const user = { ...session!.user, id: Number(session!.user.id) };
  const [enquiries, clients] = await Promise.all([getEnquiries(user), getEnquiryClientOptions(user)]);

  return (
    <>
      <PageHeader title="Enquiries" subtitle="Raise enquiries for your clients and track them through to orders." />
      <EnquiriesClient enquiries={enquiries} clients={clients} canCreate={true} canConvert={false} />
    </>
  );
}
