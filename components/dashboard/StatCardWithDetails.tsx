"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";

export type StatDetailItem = {
  id: string | number;
  primary: string;
  secondary?: string;
  /** Right-aligned text, e.g. a date or score. */
  meta?: string;
  /** Status value rendered as a Badge. */
  status?: string;
  href?: string;
};

/**
 * Wraps a server-rendered StatCard (passed as children) so clicking it opens
 * a list of the records behind its number.
 */
export function StatCardWithDetails({
  children,
  label,
  value,
  items,
  emptyMessage,
  viewAllHref,
  viewAllLabel = "View all",
}: {
  children: React.ReactNode;
  label: string;
  value: number | string;
  items: StatDetailItem[];
  emptyMessage: string;
  viewAllHref: string;
  viewAllLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`${label}: ${value}. Show details`}
        className="block w-full cursor-pointer rounded-3xl text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 active:translate-y-0"
      >
        {children}
      </button>

      <Modal open={open}>
        <div role="dialog" aria-label={label} className="space-y-4">
          <div className="flex items-start justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">{label}</h3>
              <p className="text-xs text-slate-500">
                {items.length} item{items.length === 1 ? "" : "s"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="cursor-pointer rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          </div>

          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">{emptyMessage}</p>
          ) : (
            <ul className="max-h-[55vh] divide-y divide-slate-100 overflow-y-auto">
              {items.map((item) => {
                const body = (
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{item.primary}</p>
                      {item.secondary && <p className="truncate text-xs text-slate-500">{item.secondary}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {item.status && <Badge value={item.status} />}
                      {item.meta && <span className="text-xs font-medium text-slate-500">{item.meta}</span>}
                    </div>
                  </div>
                );
                return (
                  <li key={item.id}>
                    {item.href ? (
                      <Link href={item.href} className="-mx-2 block rounded-lg px-2 transition hover:bg-slate-50">
                        {body}
                      </Link>
                    ) : (
                      body
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex justify-end border-t border-slate-100 pt-3">
            <Link
              href={viewAllHref}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              {viewAllLabel}
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </Modal>
    </>
  );
}
