"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Modal, ModalFooter, ModalHeader } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
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
        className="group block h-full w-full cursor-pointer rounded-card text-left transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0 [&>div]:transition-[border-color,box-shadow] [&>div]:group-hover:border-border-strong [&>div]:group-hover:shadow-pop"
      >
        {children}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} closeOnBackdrop>
        <ModalHeader title={label} description={`${items.length} item${items.length === 1 ? "" : "s"}`} onClose={() => setOpen(false)} />
        <div className="space-y-4">
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground/80">{emptyMessage}</p>
          ) : (
            <ul className="max-h-[55vh] divide-y divide-border overflow-y-auto">
              {items.map((item) => {
                const body = (
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{item.primary}</p>
                      {item.secondary && <p className="truncate text-xs text-muted-foreground">{item.secondary}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {item.status && <Badge value={item.status} />}
                      {item.meta && <span className="text-xs font-medium text-muted-foreground">{item.meta}</span>}
                    </div>
                  </div>
                );
                return (
                  <li key={item.id}>
                    {item.href ? (
                      <Link href={item.href} className="-mx-2 block rounded-lg px-2 transition hover:bg-subtle">
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

          <ModalFooter>
            <Button asChild>
              <Link href={viewAllHref}>
                {viewAllLabel}
                <ArrowRight />
              </Link>
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </>
  );
}
