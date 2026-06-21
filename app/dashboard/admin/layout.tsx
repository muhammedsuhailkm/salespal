import { redirect } from "next/navigation";
import { getSalesPalSession } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSalesPalSession();
  if (!session) redirect("/login");
  if (session.user.role_id !== 1) redirect("/dashboard");
  return children;
}
