"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useNavigation } from "@/components/layout/NavigationContext";
import { navConfig, roleHome } from "@/lib/nav-config";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Users,
  UserCheck,
  BarChart3,
  UsersRound,
  ListTodo,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
  Bell,
} from "lucide-react";

/* ── Icon lookup ── */
const ICON_MAP: Record<
  string,
  React.ComponentType<{ size?: number; className?: string }>
> = {
  Overview: LayoutDashboard,
  Companies: Building2,
  Users: Users,
  Clients: UserCheck,
  Reports: BarChart3,
  Team: UsersRound,
  Tasks: ListTodo,
};

/* ══════════════════════════════════════════════════
   SideNav — dark collapsible sidebar + mobile drawer
   ══════════════════════════════════════════════════ */
export function SideNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { startNavigation } = useNavigation();
  const roleId = session?.user.role_id ?? 0;
  const links = navConfig[roleId] ?? [];
  const homePath = roleHome[roleId] ?? "/dashboard";

  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Password reset state hooks
  const [resettingPassword, setResettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetMessage, setResetMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await signOut({ callbackUrl: "/login" });
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setResetMessage({ type: "error", text: "Password must be at least 6 characters long" });
      return;
    }
    setIsResetSubmitting(true);
    setResetMessage(null);
    try {
      const res = await fetch("/api/users/reset-password", {
        method: "POST",
        body: JSON.stringify({ password: newPassword }),
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (res.ok) {
        setResetMessage({ type: "success", text: "Password reset successfully!" });
        setNewPassword("");
        setTimeout(() => {
          setResettingPassword(false);
          setResetMessage(null);
          setMobileProfileOpen(false);
        }, 1500);
      } else {
        setResetMessage({ type: "error", text: data.error || "Reset failed" });
      }
    } catch (err: any) {
      setResetMessage({ type: "error", text: "An error occurred" });
    } finally {
      setIsResetSubmitting(false);
    }
  };

  /* Hydrate from localStorage */
  useEffect(() => {
    const saved = window.localStorage.getItem("sidebarExpanded");
    if (saved !== null) setIsExpanded(JSON.parse(saved));
  }, []);

  /* Persist */
  useEffect(() => {
    window.localStorage.setItem("sidebarExpanded", JSON.stringify(isExpanded));
  }, [isExpanded]);

  /* Close mobile profile sheet on navigation & clear pending state */
  useEffect(() => {
    setMobileProfileOpen(false);
    setPendingHref(null);
  }, [pathname]);

  /* Navigate optimistically: highlight immediately, let Next.js show loading.tsx */
  const navigateTo = useCallback(
    (href: string) => {
      setPendingHref(href);
      router.push(href);
    },
    [router],
  );

  function isActive(href: string) {
    // If we have a pending navigation, use that for instant highlight
    const activePath = pendingHref ?? pathname;
    if (href === homePath) return activePath === href;
    return activePath === href || activePath.startsWith(`${href}/`);
  }

  return (
    <>
      {/* ─── Desktop Sidebar ─── */}
      <aside
        className={cn(
          "hidden sm:flex flex-col shrink-0 bg-slate-950 border-r border-slate-800/40 relative transition-all duration-300 ease-in-out z-30",
          isExpanded ? "w-[240px]" : "w-[68px]",
        )}
      >
        {/* Brand */}
        <div
          className={cn(
            "flex items-center shrink-0 border-b border-slate-800/40 justify-center",
            isExpanded ? "h-20 px-3" : "h-16 px-2",
          )}
        >
          <Link
            href="/dashboard"
            className="flex items-center justify-center w-full"
          >
            {isExpanded ? (
              <img
                src="/logo_expanded_org.png"
                alt="SalesPal Logo"
                className="max-h-12 w-auto object-contain rounded"
              />
            ) : (
              <img
                src="/logo_collapsed.png"
                alt="S"
                className="h-9 w-9 object-contain rounded"
              />
            )}
          </Link>
        </div>

        {/* Nav items */}
        <nav
          className={cn(
            "flex-1 py-4 space-y-1",
            isExpanded ? "px-3 overflow-y-auto" : "px-2 overflow-y-visible",
          )}
        >
          {links.map((link) => {
            const active = isActive(link.href);
            const Icon = ICON_MAP[link.label] ?? LayoutDashboard;
            return (
              <div key={link.href} className="relative group">
                <Link
                  href={link.href}
                  onClick={() => {
                    setPendingHref(link.href);
                    startNavigation(link.href);
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-lg transition-all duration-200 ease-in-out text-[13px] font-medium cursor-pointer",
                    active
                      ? "bg-slate-800/60 text-teal-400 font-semibold shadow-inner"
                      : "text-slate-400 hover:bg-slate-900/50 hover:text-slate-200",
                    isExpanded
                      ? "px-3 py-2 w-full"
                      : "w-10 h-10 justify-center p-0 mx-auto",
                  )}
                >
                  <Icon
                    size={18}
                    className={cn(
                      "shrink-0",
                      active
                        ? "text-teal-400"
                        : "text-slate-400 group-hover:text-slate-200",
                    )}
                  />
                  {isExpanded && <span>{link.label}</span>}
                </Link>
                {/* Tooltip (collapsed only) */}
                {!isExpanded && (
                  <div className="absolute left-0 group-hover:left-[52px] top-1/2 -translate-y-1/2 ml-3 px-3 py-2 bg-slate-900 border border-slate-800 text-slate-200 text-xs font-medium rounded-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 shadow-xl pointer-events-none">
                    {link.label}
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-slate-900" />
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom — sign out */}
        <div
          className={cn(
            "shrink-0 border-t border-slate-800/40 py-4 space-y-1",
            isExpanded ? "px-3" : "px-2",
          )}
        >
          {/* Sign out (Logout) */}
          <div className="relative group">
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={cn(
                "flex items-center gap-3 w-full rounded-lg transition-colors duration-200 ease-in-out cursor-pointer text-[13px] font-medium",
                "text-slate-400 hover:bg-slate-900/60 hover:text-red-400",
                isExpanded
                  ? "px-3 py-2"
                  : "w-10 h-10 justify-center p-0 mx-auto",
                isLoggingOut && "opacity-50 cursor-not-allowed"
              )}
            >
              <LogOut
                size={18}
                className="shrink-0 text-slate-400 group-hover:text-slate-200"
              />
              {isExpanded && <span>Logout</span>}
            </button>
            {!isExpanded && (
              <div className="absolute left-0 group-hover:left-[52px] top-1/2 -translate-y-1/2 ml-3 px-3 py-2 bg-slate-900 border border-slate-800 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 shadow-xl pointer-events-none">
                Logout
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-slate-900" />
              </div>
            )}
          </div>
        </div>

        {/* Collapse / expand toggle */}
        <button
          type="button"
          className="absolute top-20 -right-3.5 z-50 flex h-7 w-7 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-500 shadow-md hover:shadow-lg hover:text-slate-800 transition-all duration-200 cursor-pointer"
          onClick={() => setIsExpanded((prev) => !prev)}
        >
          {isExpanded ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
        </button>
      </aside>

      {/* ─── Mobile Top Bar ─── */}
      <header className="sm:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between h-16 px-4 bg-slate-950 border-b border-slate-800/40">
        <div className="flex items-center gap-2">
          <img
            src="/logo_collapsed.png"
            alt="SalesPal"
            className="h-8 w-8 object-contain rounded border border-slate-800 shadow-sm"
          />
          <span className="font-semibold text-white text-sm tracking-tight">
            Sales<span className="text-teal-400">Pal</span>
          </span>
        </div>

        {/* Right Side: Notification and User Profile Badge */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="relative p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 transition-all duration-200 cursor-pointer"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-teal-500 ring-2 ring-slate-950" />
          </button>
          <button
            onClick={() => setMobileProfileOpen(true)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-200 ring-1 ring-slate-700 shadow-inner hover:ring-2 hover:ring-teal-500 transition-all cursor-pointer"
          >
            {session?.user?.name?.charAt(0)?.toUpperCase() ?? "U"}
          </button>
        </div>
      </header>

      {/* ─── Mobile Profile Bottom Sheet ─── */}
      {mobileProfileOpen && (
        <div className="sm:hidden fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setMobileProfileOpen(false)}
          />

          {/* Sheet */}
          <div className="relative w-full max-w-md bg-white rounded-t-2xl border-t border-slate-200/80 shadow-2xl p-6 z-10 flex flex-col space-y-5 slide-up pb-8">
            {/* Top Indicator bar */}
            <div className="mx-auto w-12 h-1 bg-slate-200 rounded-full shrink-0 -mt-2 mb-1" />

            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 text-base">
                Account Details
              </h3>
              <button
                onClick={() => setMobileProfileOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Profile User Info Card */}
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-base font-bold text-slate-200 ring-2 ring-slate-700 shadow-inner">
                {session?.user?.name?.charAt(0)?.toUpperCase() ?? "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 text-sm truncate">
                  {session?.user?.name}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {session?.user?.email}
                </p>
              </div>
            </div>

            {/* Role Badge and details */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 py-2 px-3.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-medium text-slate-500">System Role</span>
                <span className="inline-flex items-center rounded-md bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 ring-1 ring-inset ring-teal-600/20">
                  {roleId === 1
                    ? "Administrator"
                    : roleId === 2
                      ? "Manager"
                      : "Sales Representative"}
                </span>
              </div>
            </div>

            {/* Reset Password Option just after the System Role item */}
            <div className="space-y-3">
              {!resettingPassword ? (
                <button
                  onClick={() => {
                    setResettingPassword(true);
                    setResetMessage(null);
                    setNewPassword("");
                  }}
                  className="flex items-center justify-between w-full text-xs text-slate-700 py-2.5 px-3.5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-100 transition cursor-pointer"
                >
                  <span className="font-semibold text-slate-700">Reset Password</span>
                  <span className="text-[10px] text-teal-600 font-bold hover:underline">Change</span>
                </button>
              ) : (
                <form onSubmit={handleResetPasswordSubmit} className="space-y-3 bg-slate-50 border border-slate-100 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-700">New Password</span>
                    <button
                      type="button"
                      onClick={() => setResettingPassword(false)}
                      className="text-[9px] text-slate-400 hover:text-slate-650 font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-8 w-full rounded-lg border border-slate-200 px-3 text-[11px] outline-none focus:border-slate-400 bg-white transition"
                  />
                  {resetMessage && (
                    <p className={cn("text-[9px] font-bold", resetMessage.type === "success" ? "text-emerald-600" : "text-rose-600")}>
                      {resetMessage.text}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={isResetSubmitting}
                    className="w-full flex items-center justify-center py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] transition cursor-pointer"
                  >
                    {isResetSubmitting ? "Updating..." : "Save Password"}
                  </button>
                </form>
              )}
            </div>

            {/* Actions */}
            <div className="pt-2">
              <button
                onClick={() => {
                  setMobileProfileOpen(false);
                  handleLogout();
                }}
                disabled={isLoggingOut}
                className="flex items-center justify-center gap-2 w-full rounded-xl py-3 px-4 text-sm font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer border border-red-100/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogOut size={16} />
                <span>Log Out of SalesPal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Mobile Bottom Tab Navigation ─── */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-white/95 backdrop-blur-md border-t border-slate-200/60 shadow-[0_-2px_12px_rgba(0,0,0,0.03)] flex items-center justify-around px-2 pb-safe">
        {links.map((link) => {
          const active = isActive(link.href);
          const Icon = ICON_MAP[link.label] ?? LayoutDashboard;
          return (
             <Link
              href={link.href}
              key={link.href}
              onClick={() => {
                setPendingHref(link.href);
                startNavigation(link.href);
              }}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full py-1 text-slate-400 relative transition-all duration-150 active:scale-95 cursor-pointer",
                active ? "text-teal-600 font-semibold" : "hover:text-slate-600",
              )}
            >
              {/* Active Tab line indicator */}
              {active && (
                <span className="absolute top-0 w-8 h-[2.5px] bg-teal-500 rounded-full" />
              )}

              <Icon
                size={20}
                className={cn(
                  "shrink-0 transition-transform duration-150",
                  active ? "text-teal-600" : "text-slate-400",
                )}
              />
              <span className="text-[10px] tracking-tight mt-1">
                {link.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* ─── Global Logging Out Modal Box ─── */}
      {isLoggingOut && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl p-6 w-full max-w-xs flex flex-col items-center justify-center gap-4 text-center animate-in zoom-in-95 duration-200">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 border border-slate-100 shadow-inner">
              <svg className="animate-spin h-6 w-6 text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-slate-900 text-sm">Logging Out</h3>
              <p className="text-slate-500 text-xs">Please wait while we secure your session...</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
