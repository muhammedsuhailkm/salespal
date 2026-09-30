import { getSalesPalSession } from "@/lib/auth";
import { getEnquiries, getEnquiryClientOptions } from "@/lib/enquiries";
import { PageHeader } from "@/components/layout/PageHeader";
import { EnquiriesClient } from "@/components/enquiries/EnquiriesClient";

export default async function ManagerEnquiriesPage() {
  const session = await getSalesPalSession();
  const user = { ...session!.user, id: Number(session!.user.id) };
  const [enquiries, clients] = await Promise.all([getEnquiries(user), getEnquiryClientOptions(user)]);

  return (
    <>
      <PageHeader title="Enquiries" subtitle="Enquiries from you and your team, from quote to order." />
      <EnquiriesClient enquiries={enquiries} clients={clients} canCreate={true} canConvert={false} />
    </>
  );
}
