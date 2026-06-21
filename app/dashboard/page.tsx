import { redirect } from "next/navigation";
import { getSalesPalSession } from "@/lib/auth";
import { roleHome } from "@/lib/nav-config";

export default async function DashboardIndex() {
  const session = await getSalesPalSession();
  redirect(roleHome[session?.user.role_id ?? 1] ?? "/login");
}
