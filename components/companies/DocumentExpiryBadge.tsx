import { cn } from "@/lib/utils";
import { documentExpiryState } from "@/types/company";

const styles = {
  expired: { text: "Expired", className: "bg-rose-50 text-rose-700 border-rose-200" },
  expiring: { text: "Expiring soon", className: "bg-amber-50 text-amber-700 border-amber-200" },
  valid: { text: "Valid", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

/** Expired / expiring soon / valid pill for a document's expiry date; renders nothing when there is no expiry. */
export function DocumentExpiryBadge({ expiryDate, className }: { expiryDate: string | null; className?: string }) {
  const state = documentExpiryState(expiryDate);
  if (state === "none") return null;
  return (
    <span className={cn("rounded border px-1.5 py-0.5 text-[9px] font-bold", styles[state].className, className)}>
      {styles[state].text}
    </span>
  );
}
