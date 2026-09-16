import { redirect } from "next/navigation";
import { getSalesPalSession } from "@/lib/auth";
import { MantineChartsProvider } from "@/components/dashboard/MantineChartsProvider";
import "@mantine/core/styles.css";
import "@mantine/charts/styles.css";

export default async function SalesmanLayout({ children }: { children: React.ReactNode }) {
  const session = await getSalesPalSession();
  if (!session) redirect("/login");
  if (session.user.role_id !== 3) redirect("/dashboard");
  return <MantineChartsProvider>{children}</MantineChartsProvider>;
}
