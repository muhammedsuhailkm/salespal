import { redirect } from "next/navigation";
import { getSalesPalSession } from "@/lib/auth";

export default async function SalesmanLayout({ children }: { children: React.ReactNode }) {
  const session = await getSalesPalSession();
  if (!session) redirect("/login");
  if (session.user.role_id !== 3) redirect("/dashboard");
  return children;
}
