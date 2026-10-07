"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
export interface AlertItem {
  salesmanName: string;
  companyName: string;
  lostThisMonth: number;
  lostLastMonth: number;
}

export function SmartAlertBanner({ alerts }: { alerts: AlertItem[] }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || alerts.length === 0) return null;

  return (
    <div role="status" className="mb-6 rounded-card border border-danger/25 bg-danger-soft px-5 py-4 animate-page-in">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-control bg-danger text-white dark:text-slate-950">
          <AlertTriangle size={18} aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight text-foreground">Lost clients are rising</p>
          <div className="mt-1.5 space-y-1">
            {alerts.map((a) => (
              <p key={a.salesmanName} className="text-xs text-foreground/80 leading-relaxed">
                <span className="font-semibold text-foreground">{a.salesmanName}</span>{" "}
                ({a.companyName}) lost{" "}
                <span className="font-semibold text-danger-foreground">{a.lostThisMonth}</span> client{a.lostThisMonth !== 1 ? "s" : ""} this month
                vs {a.lostLastMonth} last month — a{" "}
                <span className="font-semibold text-danger-foreground">
                  {a.lostLastMonth > 0
                    ? `${Math.round(((a.lostThisMonth - a.lostLastMonth) / a.lostLastMonth) * 100)}%`
                    : "new"}{" "}
                  increase
                </span>
              </p>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "shrink-0")}
          aria-label="Dismiss alert"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
