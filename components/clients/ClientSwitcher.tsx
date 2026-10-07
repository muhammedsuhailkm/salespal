"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, CornerDownLeft, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { clientStatusLabel } from "@/types/client";
import { clientStatusDotClass } from "@/components/clients/client-status-ui";

type Result = { id: number; name: string; status?: string; assignedSalesman?: { name: string } | null };

const RECENT_KEY = "salespal:recent-clients";
const MAX_RECENT = 6;

/* Recently opened clients: a per-browser convenience, so storage failures are ignored. */
function readRecent(): Result[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((r) => typeof r?.id === "number" && typeof r?.name === "string") : [];
  } catch {
    return [];
  }
}
function rememberClient(client: Result) {
  try {
    const next = [client, ...readRecent().filter((r) => r.id !== client.id)].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // storage unavailable
  }
}

/**
 * Header search on the client page: find another client by name, CR no or phone and jump to it.
 * "/" focuses it; ↑ ↓ Enter to pick; recent clients show before typing.
 */
export function ClientSwitcher({
  current,
  basePath,
  teamOnly = false,
}: {
  current: Result;
  /** e.g. /dashboard/salesman/clients — the result's id is appended. */
  basePath: string;
  /** Managers: only their salesmen's clients (what the manager client page can open). */
  teamOnly?: boolean;
}) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [recent, setRecent] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const [navigating, setNavigating] = useState<number | null>(null);

  // Record this visit, then show the others as "Recent".
  useEffect(() => {
    rememberClient({ id: current.id, name: current.name, status: current.status });
  }, [current.id, current.name, current.status]);

  // Search as you type (debounced); nothing is fetched until the box is opened.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) return; // an empty box shows recent clients instead
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/clients?q=${encodeURIComponent(q)}&limit=8&details=1${teamOnly ? "&team=1" : ""}`, { signal: ctrl.signal })
        .then((res) => (res.ok ? res.json() : { clients: [] }))
        .then((json) => {
          setResults(json.clients ?? []);
          setActive(0);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 200);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query, open, teamOnly]);

  // "/" focuses the search unless the user is typing somewhere else.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  const showingRecent = !query.trim();
  const items = showingRecent ? recent : results;

  function go(client: Result) {
    setOpen(false);
    setQuery("");
    if (client.id === current.id) return;
    setNavigating(client.id);
    rememberClient(client);
    router.push(`${basePath}/${client.id}`);
  }

  return (
    <div ref={boxRef} className="relative w-full sm:w-72">
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-label="Find another client"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && items[active] ? `${listId}-${items[active].id}` : undefined}
        autoComplete="off"
        value={query}
        placeholder="Find client…"
        onFocus={() => {
          setRecent(readRecent().filter((r) => r.id !== current.id));
          setActive(0);
          setOpen(true);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, items.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && items[active]) {
            e.preventDefault();
            go(items[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
            inputRef.current?.blur();
          }
        }}
        className="w-full rounded-control border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 hover:border-border-strong focus:border-ring focus:ring-3 focus:ring-ring/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 h-9 w-full pl-9 pr-9"
      />
      {loading || navigating ? (
        <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden />
      ) : (
        !open && (
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-subtle px-1.5 font-mono text-[10px] text-muted-foreground sm:block">
            /
          </kbd>
        )
      )}

      {open && (
        <div className="animate-pop-in absolute right-0 z-30 mt-1.5 w-full min-w-[18rem] overflow-hidden rounded-card border border-border bg-popover shadow-pop">
          {showingRecent && items.length > 0 && (
            <p className="flex items-center gap-1.5 px-3 pb-1 pt-2.5 text-xs font-semibold text-muted-foreground">
              <Clock size={11} aria-hidden /> Recent
            </p>
          )}
          <ul id={listId} role="listbox" className="max-h-80 overflow-y-auto py-1">
            {items.map((c, i) => (
              <li
                key={c.id}
                id={`${listId}-${c.id}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(c)}
                className={cn("flex cursor-pointer items-center gap-2.5 px-3 py-2", i === active && "bg-muted")}
              >
                {c.status ? (
                  <span className={cn("size-2 shrink-0 rounded-full", clientStatusDotClass(c.status))} title={clientStatusLabel(c.status)} aria-hidden />
                ) : (
                  <span className="size-2 shrink-0" aria-hidden />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{c.name}</span>
                  {(c.status || c.assignedSalesman) && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {c.status ? clientStatusLabel(c.status) : ""}
                      {c.status && c.assignedSalesman ? " · " : ""}
                      {c.assignedSalesman?.name ?? ""}
                    </span>
                  )}
                </span>
                {navigating === c.id ? (
                  <Loader2 size={13} className="shrink-0 animate-spin text-muted-foreground" aria-hidden />
                ) : (
                  i === active && <CornerDownLeft size={13} className="shrink-0 text-muted-foreground" aria-hidden />
                )}
              </li>
            ))}
            {!showingRecent && !loading && items.length === 0 && <li className="px-3 py-3 text-sm text-muted-foreground">No clients match “{query.trim()}”.</li>}
            {showingRecent && items.length === 0 && <li className="px-3 py-3 text-sm text-muted-foreground">Type a client name, CR no or phone number.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
