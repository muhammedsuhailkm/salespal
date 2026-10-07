import { redirect } from "next/navigation";
import { getSalesPalSession } from "@/lib/auth";
import { NavigationProvider } from "@/components/layout/NavigationContext";
import { AppShell } from "@/components/layout/AppShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSalesPalSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <NavigationProvider>
      <AppShell>{children}</AppShell>
    </NavigationProvider>
  );
}
