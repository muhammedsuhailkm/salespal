"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Handshake, PencilLine, Tag, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { ReasonDialog } from "@/components/shared/ReasonDialog";
import { formatAmount } from "@/lib/utils";
import type { EnquiryListItem } from "@/types/enquiry";

type Action = "quote" | "negotiate" | "revise" | "confirm" | "lose";

async function stage(id: number, body: Record<string, unknown>) {
  const res = await fetch(`/api/enquiries/${id}/stage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to update enquiry");
  return data as { status: string; orderId: number | null; reopened?: boolean };
}

/** The order a re-confirmation will reopen: the latest order event was a revision request (events are newest first). */
function orderToReopen(enquiry: EnquiryListItem): number | null {
  const last = enquiry.events.find((ev) => ev.order_id && ["confirmed", "order_reopened", "revision_requested", "order_cancelled"].includes(ev.action));
  return last?.action === "revision_requested" ? last.order_id : null;
}

/** Which stage moves are offered from each status (the server enforces the same table). */
export function availableActions(status: string): Action[] {
  switch (status) {
    case "inquiry_received":
      return ["quote", "lose"];
    case "quoted":
      return ["negotiate", "confirm", "lose"];
    case "negotiation":
      return ["revise", "confirm", "lose"];
    case "offer_revised":
      return ["negotiate", "revise", "confirm", "lose"];
    default:
      return [];
  }
}

/** The single most likely next step, shown inline in table rows. */
export function primaryAction(status: string): Action | null {
  return ({ inquiry_received: "quote", quoted: "negotiate", negotiation: "revise", offer_revised: "confirm" } as Record<string, Action>)[status] ?? null;
}

const META: Record<Action, { label: string; icon: typeof Tag }> = {
  quote: { label: "Quote", icon: Tag },
  negotiate: { label: "On negotiations", icon: Handshake },
  revise: { label: "Offer revised", icon: PencilLine },
  confirm: { label: "Confirm & create order", icon: CheckCircle2 },
  lose: { label: "Mark lost", icon: XCircle },
};

/**
 * Enquiry stage buttons + their dialogs.
 * `only` limits the buttons (e.g. just the primary action in a table row).
 */
export function EnquiryStageActions({
  enquiry,
  only,
  size = "sm",
  onDone,
  onBeforeOpen,
}: {
  enquiry: EnquiryListItem;
  only?: Action[];
  size?: "sm" | "md";
  onDone: (message: string) => void;
  /** Called before a dialog opens (e.g. to close a surrounding sheet). */
  onBeforeOpen?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);
  const actions = availableActions(enquiry.status).filter((a) => !only || only.includes(a));
  if (actions.length === 0) return null;

  function start(action: Action) {
    onBeforeOpen?.();
    if (action === "negotiate") {
      setBusy(true);
      stage(enquiry.id, { action })
        .then(() => {
          onDone(`${enquiry.ref} moved to On negotiations`);
          router.refresh();
        })
        .catch((err) => onDone(err.message))
        .finally(() => setBusy(false));
      return;
    }
    setOpen(action);
  }

  return (
    <>
      {actions.map((action) => {
        const { label, icon: Icon } = META[action];
        const lose = action === "lose";
        return (
          <Button
            key={action}
            size={size}
            variant={lose ? "ghost" : action === "confirm" || only ? "primary" : "secondary"}
            className={lose ? "text-danger-foreground hover:bg-danger-soft hover:text-danger-foreground" : undefined}
            loading={busy && action === "negotiate"}
            onClick={(e) => {
              e.stopPropagation();
              start(action);
            }}
          >
            <Icon /> {label}
          </Button>
        );
      })}

      <FiguresDialog
        enquiry={enquiry}
        mode={open === "quote" || open === "revise" ? open : null}
        onClose={() => setOpen(null)}
        onSaved={(msg) => {
          setOpen(null);
          onDone(msg);
          router.refresh();
        }}
      />
      <ConfirmDialog
        enquiry={enquiry}
        open={open === "confirm"}
        onClose={() => setOpen(null)}
        onSaved={(msg) => {
          setOpen(null);
          onDone(msg);
          router.refresh();
        }}
      />
      <ReasonDialog
        open={open === "lose"}
        title={`Mark ${enquiry.ref} as lost`}
        description={`${enquiry.client_name} · ${enquiry.from} → ${enquiry.to}`}
        confirmLabel="Mark lost"
        danger
        onClose={() => setOpen(null)}
        onConfirm={async (reason) => {
          await stage(enquiry.id, { action: "lose", reason });
          setOpen(null);
          onDone(`${enquiry.ref} marked lost`);
          router.refresh();
        }}
      />
    </>
  );
}

const fieldClass =
  "h-10 w-full rounded-control border border-input bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/15";

function FiguresDialog({ enquiry, mode, onClose, onSaved }: { enquiry: EnquiryListItem; mode: "quote" | "revise" | null; onClose: () => void; onSaved: (msg: string) => void }) {
  return (
    <Dialog open={!!mode} onOpenChange={(o) => !o && onClose()}>
      {mode && (
        <DialogContent
          title={mode === "quote" ? `Quote ${enquiry.ref}` : `Revise offer · ${enquiry.ref}`}
          description={
            mode === "quote"
              ? `${enquiry.client_name} · ${enquiry.from} → ${enquiry.to}`
              : `Current quote: cost ${formatAmount(enquiry.provisional_cost ?? 0)} · profit ${formatAmount(enquiry.provisional_profit ?? 0)}. The old figures are kept in the history.`
          }
        >
          <FiguresForm key={`${enquiry.id}-${mode}`} enquiry={enquiry} mode={mode} onClose={onClose} onSaved={onSaved} />
        </DialogContent>
      )}
    </Dialog>
  );
}

function FiguresForm({ enquiry, mode, onClose, onSaved }: { enquiry: EnquiryListItem; mode: "quote" | "revise"; onClose: () => void; onSaved: (msg: string) => void }) {
  const [cost, setCost] = useState(mode === "revise" ? String(enquiry.provisional_cost ?? "") : "");
  const [profit, setProfit] = useState(mode === "revise" ? String(enquiry.provisional_profit ?? "") : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
          await stage(enquiry.id, { action: mode, cost: Number(cost), profit: Number(profit) });
          onSaved(mode === "quote" ? `${enquiry.ref} quoted` : `${enquiry.ref} offer revised`);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to save");
        } finally {
          setSaving(false);
        }
      }}
    >
      <DialogBody className="space-y-4">
        {error && <p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-sm text-danger-foreground">{error}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-foreground">Provisional cost</span>
            <input type="number" min="0" step="0.01" required autoFocus value={cost} onChange={(e) => setCost(e.target.value)} className={fieldClass} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-foreground">Provisional profit</span>
            <input type="number" step="0.01" required value={profit} onChange={(e) => setProfit(e.target.value)} className={fieldClass} />
          </label>
        </div>
        <div className="flex items-center justify-between rounded-control bg-subtle px-3 py-2.5 text-sm">
          <span className="text-muted-foreground">Quote total (cost + profit)</span>
          <span className="font-semibold tabular-nums text-foreground">{formatAmount((Number(cost) || 0) + (Number(profit) || 0))}</span>
        </div>
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button type="submit" loading={saving}>{mode === "quote" ? "Save quote" : "Save revised offer"}</Button>
      </DialogFooter>
    </form>
  );
}

function ConfirmDialog({ enquiry, open, onClose, onSaved }: { enquiry: EnquiryListItem; open: boolean; onClose: () => void; onSaved: (msg: string) => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const total = (enquiry.provisional_cost ?? 0) + (enquiry.provisional_profit ?? 0);
  const reopenId = orderToReopen(enquiry);
  const orderNo = (id: number | null) => `#${String(id).padStart(5, "0")}`;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      {open && (
        <DialogContent title={`Confirm ${enquiry.ref}`} description={
            reopenId
              ? `The client accepted the revised offer. Order ${orderNo(reopenId)} is reopened in Transit with the new amount; its job no, invoice details and payments are kept.`
              : "The client accepted the offer. This creates the order (status Transit) for accounts to process."
          }
        >
          <DialogBody className="space-y-3">
            {error && <p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-sm text-danger-foreground">{error}</p>}
            <dl className="grid grid-cols-2 gap-3 rounded-control border border-border p-3 text-sm">
              <div><dt className="text-xs text-muted-foreground">Client</dt><dd className="font-medium text-foreground">{enquiry.client_name}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Route</dt><dd className="font-medium text-foreground">{enquiry.from} → {enquiry.to}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Cost / profit</dt><dd className="font-medium tabular-nums text-foreground">{formatAmount(enquiry.provisional_cost ?? 0)} / {formatAmount(enquiry.provisional_profit ?? 0)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Order amount</dt><dd className="font-semibold tabular-nums text-foreground">{formatAmount(total)}</dd></div>
            </dl>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Back</Button>
            <Button
              loading={saving}
              onClick={async () => {
                setSaving(true);
                setError(null);
                try {
                  const res = await stage(enquiry.id, { action: "confirm" });
                  onSaved(`${enquiry.ref} confirmed · order ${orderNo(res.orderId)} ${res.reopened ? "reopened" : "created"}`);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed to confirm");
                } finally {
                  setSaving(false);
                }
              }}
            >
              <CheckCircle2 /> {reopenId ? "Confirm & reopen order" : "Confirm & create order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
