"use client";

import { useState } from "react";
import { Download, ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** The last 12 months, newest first, as { key: "YYYY-MM", label: "September 2026" }. */
function recentMonths(count = 12) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    return {
      key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }) + (i === 0 ? " (so far)" : ""),
    };
  });
}

/** Month picker that opens the salesman's monthly performance PDF (GET /api/reports/salesman/[id]). */
export function PerformanceReportButton({ salesmanId, salesmanName, compact = false }: { salesmanId: number; salesmanName: string; compact?: boolean }) {
  const [months] = useState(recentMonths);
  const [month, setMonth] = useState(months[0].key);
  const [open, setOpen] = useState(false);
  const href = (download: boolean) => `/api/reports/salesman/${salesmanId}?month=${month}${download ? "&download=1" : ""}`;

  const trigger = compact ? (
    <Button variant="outline" size="sm" aria-label={`Performance report for ${salesmanName}`}>
      <FileText /> Report
    </Button>
  ) : (
    <Button variant="outline">
      <FileText /> Performance report
    </Button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-80">
        <p className="text-sm font-semibold text-foreground">Monthly performance report</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          PDF for {salesmanName}: onboarded clients, enquiry summary, lost enquiries with reasons, orders and activity.
        </p>
        <label className="mt-3 block text-xs font-medium text-muted-foreground" htmlFor={`report-month-${salesmanId}`}>
          Month
        </label>
        <select
          id={`report-month-${salesmanId}`}
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-full rounded-control border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 hover:border-border-strong focus:border-ring focus:ring-3 focus:ring-ring/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 h-9 w-full cursor-pointer"
        >
          {months.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
        <div className="mt-4 flex gap-2">
          <Button asChild className="flex-1" onClick={() => setOpen(false)}>
            <a href={href(false)} target="_blank" rel="noopener">
              <ExternalLink /> Open PDF
            </a>
          </Button>
          <Button asChild variant="secondary" onClick={() => setOpen(false)}>
            <a href={href(true)} download>
              <Download /> Download
            </a>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
