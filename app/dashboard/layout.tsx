import { redirect } from "next/navigation";
import { getSalesPalSession } from "@/lib/auth";
import { SideNav } from "@/components/layout/SideNav";
import { Bell } from "lucide-react";
import { NavigationProvider } from "@/components/layout/NavigationContext";
import { DashboardContentWrapper } from "@/components/layout/DashboardContentWrapper";
import { DesktopHeaderProfile } from "@/components/layout/DesktopHeaderProfile";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSalesPalSession();

  if (!session) {
    redirect("/login");
  }

  // Determine role title for display in the header
  const roleName = session.user.role_id === 1 
    ? "Admin Dashboard" 
    : session.user.role_id === 2 
      ? "Manager Dashboard" 
      : "Salesman Dashboard";

  return (
    <NavigationProvider>
      <div className="flex h-screen bg-slate-50">
        <SideNav />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Desktop Header */}
          <header className="hidden sm:flex items-center justify-between h-16 bg-slate-950 border-b border-slate-800/40 px-6 shrink-0 z-20">
            <div>
              <h2 className="text-sm font-semibold text-white leading-tight">
                Welcome back, {session.user.name}
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {roleName}
              </p>
            </div>
            <div className="flex items-center gap-3.5">
              <button 
                type="button"
                className="relative p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 transition-all duration-200 cursor-pointer"
              >
                <Bell size={18} />
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-teal-500 ring-2 ring-slate-950" />
              </button>
              <DesktopHeaderProfile />
            </div>
          </header>

          {/* Main Content scrollable area */}
          <main className="flex-1 overflow-auto">
            <div className="mx-auto w-full max-w-7xl px-4 pt-20 pb-24 sm:pt-6 sm:px-6 lg:px-8 sm:pb-8">
              <DashboardContentWrapper>
                {children}
              </DashboardContentWrapper>
            </div>
          </main>
        </div>
      </div>
    </NavigationProvider>
  );
}

