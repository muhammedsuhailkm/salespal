import { cn, titleCase } from "@/lib/utils";
import { enquiryStatusLabels } from "@/types/enquiry";

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral" | "primary";

const toneClasses: Record<StatusTone, string> = {
  success: "bg-success-soft text-success-foreground",
  warning: "bg-warning-soft text-warning-foreground",
  danger: "bg-danger-soft text-danger-foreground",
  info: "bg-info-soft text-info-foreground",
  primary: "bg-primary-soft text-primary-soft-foreground",
  neutral: "bg-muted text-muted-foreground",
};

const dotClasses: Record<StatusTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  primary: "bg-primary",
  neutral: "bg-muted-foreground",
};

/** One place that decides which tone a status value gets. */
const STATUS_TONES: Record<string, StatusTone> = {
  // Enquiry stages
  inquiry_received: "neutral",
  quoted: "info",
  negotiation: "warning",
  offer_revised: "primary",
  confirmed: "success",
  lost: "danger",
};

const STATUS_LABELS: Record<string, string> = enquiryStatusLabels;

export function StatusBadge({ status, tone, label, className }: { status: string; tone?: StatusTone; label?: string; className?: string }) {
  const t = tone ?? STATUS_TONES[status] ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
        toneClasses[t],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", dotClasses[t])} aria-hidden />
      {label ?? STATUS_LABELS[status] ?? titleCase(status)}
    </span>
  );
}
