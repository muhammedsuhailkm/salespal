"use client";

import {
  MapPin,
  Anchor,
  ArrowRight,
  Clock,
  Calendar,
  CheckCircle2,
  Ship,
  Plane,
  Truck,
  Edit3,
  Trash2,
  Loader2,
} from "lucide-react";
import { Badge, type BadgeVariant } from "@/components/ds/Badge";
import { cn, formatDate } from "@/lib/utils";

const MODE_ICON: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  air: Plane,
  sea: Ship,
  land: Truck,
};

export type RateCardBadge = "best-price" | "fastest" | "popular" | "limited" | "none";

interface RateCardProps {
  carrier?: string | null;
  container: string;
  price: string;
  currency?: string;
  mode: string;
  origin: string;
  destination: string;
  updatedAt: string | Date;
  updatedBy?: string;
  badge?: RateCardBadge;
  selected?: boolean;
  expired?: boolean;
  // Editable actions
  editable?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
}

const BADGE_MAP: Record<string, { label: string; variant: BadgeVariant }> = {
  "best-price": { label: "Best Price", variant: "positive" },
  fastest: { label: "Fastest", variant: "info" },
  popular: { label: "Popular", variant: "accent" },
  limited: { label: "Limited", variant: "warning" },
};

export function RateCard({
  carrier,
  container,
  price,
  currency = "USD",
  mode,
  origin,
  destination,
  updatedAt,
  updatedBy,
  badge = "none",
  selected = false,
  expired = false,
  editable = false,
  onEdit,
  onDelete,
  isDeleting = false,
}: RateCardProps) {
  const ModeIcon = MODE_ICON[mode] ?? Ship;
  const badgeInfo = badge !== "none" ? BADGE_MAP[badge] : null;
  const containerLabel = container === "20gp" ? "20FT" : container === "40hc" ? "40FT HC" : container.toUpperCase();
  const currencyLabel = currency === "QAR" ? "QAR" : "USD";

  return (
    <div
      className={cn(
        "ss-rate-card",
        selected && "ss-rate-card--selected",
        expired && "ss-rate-card--expired",
      )}
    >
      {/* Header: Carrier + Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="ss-carrier-name text-sm truncate">
            {carrier || "—"}
          </span>
          <span className="ss-type-caption flex items-center gap-1">
            <ModeIcon size={12} className="shrink-0" />
            {containerLabel}
          </span>
        </div>
        {badgeInfo && <Badge label={badgeInfo.label} variant={badgeInfo.variant} />}
      </div>

      {/* Route */}
      <div className="flex items-center gap-1.5 text-[13px]">
        <MapPin size={13} className="shrink-0" style={{ color: "var(--ss-teal-600)" }} />
        <span className="font-semibold truncate" style={{ color: "var(--ds-text-primary)" }}>
          {origin}
        </span>
        <ArrowRight size={12} className="shrink-0" style={{ color: "var(--ds-text-muted)" }} />
        <Anchor size={13} className="shrink-0" style={{ color: "var(--ss-blue-600)" }} />
        <span className="font-semibold truncate" style={{ color: "var(--ds-text-primary)" }}>
          {destination}
        </span>
      </div>

      {/* Price */}
      <div className="flex items-baseline gap-1.5">
        <span className={cn("ss-type-price-lg", selected && "ss-text-brand")}>
          {price}
        </span>
        <span className="ss-type-caption">{currencyLabel}</span>
      </div>

      {/* Details: updated date */}
      <div
        className="flex items-center justify-between gap-2 pt-3"
        style={{ borderTop: "1px solid var(--ds-border-subtle)" }}
      >
        <div className="flex items-center gap-1.5 ss-type-caption">
          <Clock size={12} className="shrink-0" style={{ color: "var(--ds-text-muted)" }} />
          <span>{formatDate(updatedAt)}</span>
          {updatedBy && (
            <span style={{ color: "var(--ds-text-muted)" }}>by {updatedBy}</span>
          )}
        </div>
        {selected && (
          <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--ds-color-brand)" }}>
            <CheckCircle2 size={14} />
          </div>
        )}
      </div>

      {/* Editable actions */}
      {editable && (
        <div
          className="flex gap-0 -mx-4 -mb-4 mt-1"
          style={{ borderTop: "1px solid var(--ds-border-subtle)" }}
        >
          <button
            type="button"
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition cursor-pointer hover:bg-slate-50"
            style={{ color: "var(--ds-text-secondary)" }}
          >
            <Edit3 size={13} />
            <span>Edit</span>
          </button>
          <div style={{ width: "1px", background: "var(--ds-border-subtle)" }} />
          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition cursor-pointer hover:bg-red-50 disabled:opacity-50"
            style={{ color: "var(--ds-text-secondary)" }}
          >
            {isDeleting ? (
              <Loader2 size={13} className="animate-spin" style={{ color: "var(--ds-status-negative-text)" }} />
            ) : (
              <Trash2 size={13} />
            )}
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
}
