import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Building2,
  ClipboardList,
  LayoutDashboard,
  LayoutGrid,
  ListTodo,
  Package,
  Ship,
  Target,
  UserCheck,
  Users,
  UsersRound,
} from "lucide-react";
import { navConfig, roleHome } from "@/lib/nav-config";

/** Presentation-only metadata for the links defined in lib/nav-config.ts. */
const ICONS: Record<string, LucideIcon> = {
  Dashboard: LayoutDashboard,
  Overview: LayoutGrid,
  Companies: Building2,
  Users: Users,
  Clients: UserCheck,
  Reports: BarChart3,
  Team: UsersRound,
  Salesmen: Target,
  Enquiries: ClipboardList,
  Tasks: ListTodo,
  Orders: Package,
  "Shipping Rates": Ship,
};

const GROUPS: Record<string, string> = {
  Dashboard: "Overview",
  Overview: "Overview",
  Team: "Team",
  Salesmen: "Team",
  Tasks: "Team",
  Clients: "Sales",
  Enquiries: "Sales",
  Orders: "Sales",
  "Shipping Rates": "Operations",
  Companies: "Administration",
  Users: "Administration",
  Reports: "Reports",
};

export type NavItem = { label: string; href: string; icon: LucideIcon };
export type NavGroup = { label: string; items: NavItem[] };

export const ROLE_LABELS: Record<number, string> = {
  1: "Administrator",
  2: "Manager",
  3: "Sales Representative",
  4: "Accountant",
};

export function getNavItems(roleId: number): NavItem[] {
  return (navConfig[roleId] ?? []).map((link) => ({ ...link, icon: ICONS[link.label] ?? LayoutDashboard }));
}

/** Groups links in nav-config order; a group appears where its first link does. */
export function getNavGroups(roleId: number): NavGroup[] {
  const groups: NavGroup[] = [];
  for (const item of getNavItems(roleId)) {
    const label = GROUPS[item.label] ?? "General";
    const group = groups.find((g) => g.label === label);
    if (group) group.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}

/** Same matching rules the sidebar has always used. */
export function isNavActive(href: string, activePath: string, roleId: number) {
  const homePath = roleHome[roleId] ?? "/dashboard";
  if (href === homePath || href === "/dashboard/salesman" || href === "/dashboard/admin" || href === "/dashboard/manager") {
    return activePath === href;
  }
  return activePath === href || activePath.startsWith(`${href}/`);
}

/** Breadcrumb trail for the current path, built from the role's nav links. */
export function getBreadcrumbs(pathname: string, roleId: number): string[] {
  const items = getNavItems(roleId);
  const match = items
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
  if (!match) return ["Dashboard"];
  const rest = pathname.slice(match.href.length).split("/").filter(Boolean);
  const crumbs = [GROUPS[match.label] ?? "Dashboard", match.label];
  if (rest.length) crumbs.push(rest[rest.length - 1] === "new" ? "New" : "Details");
  // Avoid "Overview › Overview"
  return crumbs.filter((c, i) => c !== crumbs[i - 1]);
}
