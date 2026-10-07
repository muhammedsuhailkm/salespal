"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { LogOut } from "lucide-react";
import { useNavigation } from "@/components/layout/NavigationContext";
import { useShell } from "@/components/layout/ShellContext";
import { getNavGroups, getNavItems, isNavActive } from "@/components/layout/nav-meta";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/dashboard"
      className={cn("flex items-center gap-2.5 rounded-control transition-opacity hover:opacity-90", compact && "justify-center")}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-card p-1 shadow-xs ring-1 ring-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo_collapsed.png" alt="SalesPal logo" className="size-full rounded object-contain" />
      </span>
      {!compact && (
        <span className="whitespace-nowrap text-[17px] font-semibold tracking-tight text-foreground">
          Sales<span className="text-primary">Pal</span>
        </span>
      )}
    </Link>
  );
}

/** Grouped nav links; shared by the desktop sidebar and the mobile drawer. */
function SidebarNav({ compact }: { compact: boolean }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { startNavigation } = useNavigation();
  const { pendingHref, setPendingHref, isLoggingOut, logout } = useShell();
  const roleId = session?.user.role_id ?? 0;
  const groups = getNavGroups(roleId);
  // If we have a pending navigation, use that for instant highlight
  const activePath = pendingHref ?? pathname;

  return (
    <>
      <nav aria-label="Main" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {groups.map((group, index) => (
          <div key={group.label}>
            {compact ? (
              index > 0 && <div className="mx-auto mb-3 h-px w-6 bg-sidebar-border" aria-hidden />
            ) : (
              <p className="mb-1.5 px-3 text-xs font-semibold text-sidebar-muted">{group.label}</p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isNavActive(item.href, activePath, roleId);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <SimpleTooltip label={item.label} side="right" disabled={!compact}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        aria-label={compact ? item.label : undefined}
                        onClick={() => {
                          setPendingHref(item.href);
                          startNavigation(item.href);
                        }}
                        className={cn(
                          "group flex items-center gap-3 rounded-control text-sm font-medium transition-colors",
                          compact ? "mx-auto size-10 justify-center" : "h-9 px-3",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground hover:bg-sidebar-hover hover:text-foreground",
                        )}
                      >
                        <Icon
                          size={18}
                          className={cn(
                            "shrink-0",
                            active ? "text-sidebar-accent-foreground" : "text-sidebar-muted group-hover:text-foreground",
                          )}
                        />
                        {!compact && <span className="truncate">{item.label}</span>}
                      </Link>
                    </SimpleTooltip>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-sidebar-border p-3">
        <SimpleTooltip label="Logout" side="right" disabled={!compact}>
          <button
            type="button"
            onClick={logout}
            disabled={isLoggingOut}
            aria-label={compact ? "Logout" : undefined}
            className={cn(
              "group flex w-full cursor-pointer items-center gap-3 rounded-control text-sm font-medium text-sidebar-foreground transition-colors hover:bg-danger-soft hover:text-danger-foreground disabled:cursor-not-allowed disabled:opacity-50",
              compact ? "mx-auto size-10 justify-center" : "h-9 px-3",
            )}
          >
            <LogOut size={18} className="shrink-0 text-sidebar-muted group-hover:text-danger-foreground" />
            {!compact && <span>Logout</span>}
          </button>
        </SimpleTooltip>
      </div>
    </>
  );
}

/** Desktop: collapsible rail. Mobile: slide-in drawer. */
export function Sidebar() {
  const pathname = usePathname();
  const { expanded, mobileOpen, setMobileOpen, setPendingHref } = useShell();

  /* Close the drawer on navigation & clear pending state */
  useEffect(() => {
    setMobileOpen(false);
    setPendingHref(null);
  }, [pathname, setMobileOpen, setPendingHref]);

  return (
    <>
      <aside
        className={cn(
          "relative z-30 hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-out md:flex",
          expanded ? "w-[248px]" : "w-[72px]",
        )}
      >
        <div className={cn("flex h-16 shrink-0 items-center", expanded ? "px-5" : "justify-center px-2")}>
          <Brand compact={!expanded} />
        </div>
        <SidebarNav compact={!expanded} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" title="Navigation" hideTitle className="bg-sidebar md:hidden">
          <div className="flex h-16 shrink-0 items-center px-5">
            <Brand />
          </div>
          <SidebarNav compact={false} />
        </SheetContent>
      </Sheet>
    </>
  );
}

/** Thumb-reachable tab bar for phones (same links as the sidebar). */
export function MobileTabBar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { startNavigation } = useNavigation();
  const { pendingHref, setPendingHref } = useShell();
  const roleId = session?.user.role_id ?? 0;
  const activePath = pendingHref ?? pathname;

  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch justify-around border-t border-border bg-card/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      {getNavItems(roleId).map((item) => {
        const active = isNavActive(item.href, activePath, roleId);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={() => {
              setPendingHref(item.href);
              startNavigation(item.href);
            }}
            className={cn(
              "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-muted-foreground transition-colors active:scale-95",
              active ? "font-semibold text-primary" : "hover:text-foreground",
            )}
          >
            {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" aria-hidden />}
            <Icon size={20} className="shrink-0" />
            <span className="max-w-full truncate px-0.5 text-[10px] leading-none tracking-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
