"use client";

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Footer for server-paginated lists: "1–50 of 1,234" with prev / next. */
export function Pagination({
  page,
  pageSize,
  total,
  onPage,
  pending = false,
  noun = "results",
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  pending?: boolean;
  noun?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const btn =
    "press inline-flex h-8 cursor-pointer items-center gap-1 rounded-control border border-border bg-card px-2.5 text-xs font-medium text-foreground shadow-xs hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 px-1 py-2 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-2">
        {pending && <Loader2 size={12} className="animate-spin" aria-hidden />}
        <span>
          <strong className="font-semibold text-foreground">{from.toLocaleString()}–{to.toLocaleString()}</strong> of{" "}
          <strong className="font-semibold text-foreground">{total.toLocaleString()}</strong> {noun}
        </span>
      </span>
      {pages > 1 && (
        <div className="flex items-center gap-1.5">
          <button type="button" className={btn} disabled={page <= 1 || pending} onClick={() => onPage(page - 1)} aria-label="Previous page">
            <ChevronLeft size={14} /> Prev
          </button>
          <span className={cn("px-1 tabular-nums")}>
            Page {page} / {pages}
          </span>
          <button type="button" className={btn} disabled={page >= pages || pending} onClick={() => onPage(page + 1)} aria-label="Next page">
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </nav>
  );
}
