"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

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
    <div className="mb-6 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 px-5 py-4 text-white shadow-lg shadow-rose-200/40 animate-in fade-in slide-in-from-top-2 duration-400">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
          <AlertTriangle size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">Performance Alert</p>
          <div className="mt-1.5 space-y-1">
            {alerts.map((a) => (
              <p key={a.salesmanName} className="text-xs text-rose-100 leading-relaxed">
                <span className="font-semibold text-white">{a.salesmanName}</span>{" "}
                ({a.companyName}) lost{" "}
                <span className="font-semibold text-white">{a.lostThisMonth}</span> client{a.lostThisMonth !== 1 ? "s" : ""} this month
                vs {a.lostLastMonth} last month — a{" "}
                <span className="font-semibold text-white">
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
          className="shrink-0 rounded-lg p-1.5 text-rose-200 hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
          aria-label="Dismiss alert"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
