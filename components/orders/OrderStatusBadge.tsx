import { Badge } from "@/components/ui/Badge";
import type { OrderStatus } from "@/types/order";

export function OrderStatusBadge({ status, className }: { status: OrderStatus | string; className?: string }) {
  return <Badge value={status} className={className} />;
}
