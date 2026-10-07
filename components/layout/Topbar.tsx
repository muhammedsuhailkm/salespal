"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Bell, ChevronRight, Menu, PanelLeft, Search } from "lucide-react";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { useShell } from "@/components/layout/ShellContext";
import { UserMenu } from "@/components/layout/UserMenu";
import { getBreadcrumbs } from "@/components/layout/nav-meta";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { SimpleTooltip } from "@/components/ui/tooltip";

export function Topbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { expanded, toggleExpanded, setMobileOpen } = useShell();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const crumbs = getBreadcrumbs(pathname, session?.user.role_id ?? 0);

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur-md sm:px-6">
      <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
        <Menu />
      </Button>
      <SimpleTooltip label={expanded ? "Collapse sidebar" : "Expand sidebar"} side="bottom">
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:inline-flex"
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
          aria-expanded={expanded}
          onClick={toggleExpanded}
        >
          <PanelLeft />
        </Button>
      </SimpleTooltip>

      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex min-w-0 items-center gap-1.5 text-sm">
          {crumbs.map((crumb, index) => {
            const last = index === crumbs.length - 1;
            return (
              <li key={`${crumb}-${index}`} className={last ? "flex min-w-0 items-center gap-1.5" : "hidden items-center gap-1.5 sm:flex"}>
                {index > 0 && <ChevronRight className="hidden size-3.5 shrink-0 text-muted-foreground/70 sm:block" aria-hidden />}
                <span
                  aria-current={last ? "page" : undefined}
                  className={last ? "truncate font-semibold text-foreground" : "text-muted-foreground"}
                >
                  {crumb}
                </span>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="flex items-center gap-1 sm:gap-1.5">
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="hidden h-9 w-56 cursor-pointer items-center gap-2 rounded-control border border-border bg-card px-3 text-sm text-muted-foreground shadow-xs transition-colors hover:border-border-strong lg:flex"
        >
          <Search className="size-4" aria-hidden />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="rounded-md border border-border bg-muted px-1.5 text-[11px] font-medium">⌘K</kbd>
        </button>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Search pages" onClick={() => setPaletteOpen(true)}>
          <Search />
        </Button>

        <ThemeToggle />

        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell />
          <span className="absolute right-2 top-2 size-2 rounded-full bg-primary ring-2 ring-background" aria-hidden />
        </Button>

        <div className="ml-1 h-6 w-px bg-border" aria-hidden />
        <UserMenu />
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </header>
  );
}
