import { redirect } from "next/navigation";

// Salesmen targets now live on the Team page.
export default function ManagerSalesmenPage() {
  redirect("/dashboard/manager/team");
}
