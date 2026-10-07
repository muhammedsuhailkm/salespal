import { cn, titleCase } from "@/lib/utils";
import { clientStatusLabels, type ClientStatus } from "@/types/client";
import { clientStatusDot } from "@/components/clients/client-status-ui";

/**
 * Client pipeline / task / approval status pill. The pipeline gets distinct hues (it's data:
 * people scan for "where is this client"), every other status uses the semantic tones.
 * Each entry carries its dark-mode pair so pills stay legible on dark surfaces.
 */
const colors: Record<string, string> = {
  // Pipeline
  lead: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/25",
  contacted: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/25",
  follow_up: "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-500/25",
  enquiry: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-500/25",
  onboarded: "bg-success-soft text-success-foreground ring-success/25",
  dormant: "bg-muted text-muted-foreground ring-border-strong",
  lost: "bg-danger-soft text-danger-foreground ring-danger/25",
  blacklisted: "bg-foreground text-background ring-foreground",
  // Generic states
  cancelled: "bg-danger-soft text-danger-foreground ring-danger/25",
  pending: "bg-muted text-foreground/80 ring-border",
  in_process: "bg-info-soft text-info-foreground ring-info/25",
  achieved: "bg-success-soft text-success-foreground ring-success/25",
  unsuccessful: "bg-danger-soft text-danger-foreground ring-danger/25",
  draft: "bg-muted text-foreground/80 ring-border",
  completed: "bg-success-soft text-success-foreground ring-success/25",
  approved: "bg-success-soft text-success-foreground ring-success/25",
  rejected: "bg-danger-soft text-danger-foreground ring-danger/25",
};

/** Small coloured dot for the same statuses (legends, compact rows). */
export const statusDotClass: Record<string, string> = clientStatusDot;

export function Badge({ value, className }: { value: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", colors[value] ?? colors.pending, className)}>
      {clientStatusLabels[value as ClientStatus] ?? titleCase(value)}
    </span>
  );
}
