"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CornerDownLeft, Search } from "lucide-react";
import { useNavigation } from "@/components/layout/NavigationContext";
import { getNavItems } from "@/components/layout/nav-meta";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** ⌘K / Ctrl+K quick navigation across the pages this role can open. */
export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const { data: session } = useSession();
  const { startNavigation } = useNavigation();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const items = getNavItems(session?.user.role_id ?? 0);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((item) => item.label.toLowerCase().includes(q)) : items;
  }, [items, query]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  function go(href: string) {
    onOpenChange(false);
    startNavigation(href);
    router.push(href);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setQuery("");
          setActiveIndex(0);
        }
      }}
    >
      <DialogContent title="Search pages" hideHeader showClose={false} className="mt-[12vh] self-start p-0">
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && results[activeIndex]) {
                e.preventDefault();
                go(results[activeIndex].href);
              }
            }}
            placeholder="Jump to a page…"
            aria-label="Search pages"
            aria-controls="command-results"
            aria-activedescendant={results[activeIndex] ? `cmd-${activeIndex}` : undefined}
            className="h-12 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden rounded-md border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground sm:inline">Esc</kbd>
        </div>
        <ul id="command-results" role="listbox" className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 ? (
            <li className="px-3 py-8 text-center text-sm text-muted-foreground">No pages match “{query}”.</li>
          ) : (
            results.map((item, index) => {
              const Icon = item.icon;
              const active = index === activeIndex;
              return (
                <li
                  key={item.href}
                  id={`cmd-${index}`}
                  role="option"
                  aria-selected={active}
                  onMouseMove={() => setActiveIndex(index)}
                  onClick={() => go(item.href)}
                  className={cn(
                    "flex h-10 cursor-pointer items-center gap-3 rounded-control px-3 text-sm",
                    active ? "bg-primary-soft text-primary-soft-foreground" : "text-foreground",
                  )}
                >
                  <Icon size={16} className={active ? "" : "text-muted-foreground"} />
                  <span className="flex-1">{item.label}</span>
                  {active && <CornerDownLeft size={14} aria-hidden />}
                </li>
              );
            })
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
