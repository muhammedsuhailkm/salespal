import { StatusBadge, type StatusTone } from "@/components/shared/StatusBadge";
import { orderStatusLabel } from "@/types/order";

const TONES: Record<string, StatusTone> = {
  transit: "info",
  delivered: "primary",
  completed: "success",
  revision_requested: "warning",
  cancelled: "danger",
};

export function OrderStatusBadge({ status, className }: { status: string; className?: string }) {
  return <StatusBadge status={status} tone={TONES[status] ?? "neutral"} label={orderStatusLabel(status)} className={className} />;
}
