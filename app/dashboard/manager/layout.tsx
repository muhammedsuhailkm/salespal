import { redirect } from "next/navigation";
import { getSalesPalSession } from "@/lib/auth";

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const session = await getSalesPalSession();
  if (!session) redirect("/login");
  if (session.user.role_id !== 2) redirect("/dashboard");
  return children;
}
