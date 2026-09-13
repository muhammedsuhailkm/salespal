import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { OrderApprovalStatus } from "@/types/order";

export function ApprovalBadge({
  label,
  status,
  className,
}: {
  label?: string;
  status: OrderApprovalStatus | string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500", className)}>
      {label}
      <Badge value={status} />
    </span>
  );
}
