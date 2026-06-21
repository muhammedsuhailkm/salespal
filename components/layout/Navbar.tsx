"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { navConfig } from "@/lib/nav-config";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const roleId = session?.user.role_id ?? 0;
  const links = navConfig[roleId] ?? [];

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link className="text-lg font-semibold text-slate-950" href="/dashboard">SalesPal</Link>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span className="hidden sm:inline">{session?.user?.name}</span>
            <button className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50" onClick={() => signOut({ callbackUrl: "/login" })}>Sign out</button>
          </div>
        </div>
        <nav className="flex gap-2 overflow-x-auto">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link key={link.href} className={cn("whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100", active && "bg-slate-950 text-white hover:bg-slate-950")} href={link.href}>
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
