import { cn } from "@/lib/utils";
import { documentExpiryState } from "@/types/company";

const styles = {
  expired: { text: "Expired", className: "bg-danger-soft text-danger-foreground border-danger/30" },
  expiring: { text: "Expiring soon", className: "bg-warning-soft text-warning-foreground border-warning/30" },
  valid: { text: "Valid", className: "bg-success-soft text-success-foreground border-success/30" },
};

/** Expired / expiring soon / valid pill for a document's expiry date; renders nothing when there is no expiry. */
export function DocumentExpiryBadge({ expiryDate, className }: { expiryDate: string | null; className?: string }) {
  const state = documentExpiryState(expiryDate);
  if (state === "none") return null;
  return (
    <span className={cn("rounded border px-1.5 py-0.5 text-[9px] font-semibold", styles[state].className, className)}>
      {styles[state].text}
    </span>
  );
}
