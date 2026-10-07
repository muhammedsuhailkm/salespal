"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle2, ClipboardEdit, RotateCcw, Truck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { ReasonDialog } from "@/components/shared/ReasonDialog";
import { formatAmount, formatDate } from "@/lib/utils";
import type { OrderListItem } from "@/types/order";

export type OrderRole = "salesman" | "manager" | "accountant";

const OPEN = ["transit", "delivered"];

async function postJson(url: string, body: unknown, method = "POST") {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

/**
 * Role-aware order buttons (rules enforced again on the server, lib/enquiry-flow.ts):
 *   accounts: Add details · Mark delivered · Mark completed · Cancel
 *   manager:  Request revision · Cancel
 *   salesman: Request revision
 */
export function OrderActions({ order, role, onDone, size = "sm" }: { order: OrderListItem; role: OrderRole; onDone: (message: string) => void; size?: "sm" | "md" }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"details" | "revision" | "cancel" | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const isOpen = OPEN.includes(order.status);
  if (!isOpen) return null;

  const accounts = role === "accountant";
  const hasDetails = !!order.job_no && !!order.invoice_date;
  const fullyPaid = order.balance <= 0.005;

  async function act(action: string, body: Record<string, unknown> = {}, message: string) {
    setBusy(action);
    try {
      await postJson(`/api/orders/${order.id}/status`, { action, ...body });
      onDone(message);
      router.refresh();
    } catch (err) {
      onDone(err instanceof Error ? err.message : "Failed to update order");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {accounts && (
        <Button size={size} variant={hasDetails ? "secondary" : "primary"} onClick={() => setDialog("details")}>
          <ClipboardEdit /> {hasDetails ? "Edit details" : "Add details"}
        </Button>
      )}
      {accounts && order.status === "transit" && (
        <Button
          size={size}
          variant="secondary"
          disabled={!hasDetails}
          title={!hasDetails ? "Add the job no and invoice date first" : undefined}
          loading={busy === "deliver"}
          onClick={() => act("deliver", {}, "Order marked delivered")}
        >
          <Truck /> Mark delivered
        </Button>
      )}
      {accounts && order.status === "delivered" && (
        <Button
          size={size}
          disabled={!fullyPaid}
          title={!fullyPaid ? `Balance of ${formatAmount(order.balance)} still due` : undefined}
          loading={busy === "complete"}
          onClick={() => act("complete", {}, "Order completed")}
        >
          <CheckCircle2 /> Mark completed
        </Button>
      )}
      {(role === "salesman" || role === "manager") && (
        <Button size={size} variant="secondary" onClick={() => setDialog("revision")}>
          <RotateCcw /> Request revision
        </Button>
      )}
      {(role === "manager" || accounts) && (
        <Button size={size} variant="ghost" className="text-danger-foreground hover:bg-danger-soft hover:text-danger-foreground" onClick={() => setDialog("cancel")}>
          <Ban /> Cancel
        </Button>
      )}

      <ReasonDialog
        open={dialog === "revision"}
        title="Request revision"
        description="The order is put on hold and its enquiry goes back to On negotiations. Revise the offer and confirm again to reopen this same order."
        confirmLabel="Send back for revision"
        onClose={() => setDialog(null)}
        onConfirm={async (reason) => {
          await postJson(`/api/orders/${order.id}/status`, { action: "request_revision", reason });
          setDialog(null);
          onDone("Order sent back for revision");
          router.refresh();
        }}
      />
      <ReasonDialog
        open={dialog === "cancel"}
        title="Cancel order"
        description="The order is cancelled and its enquiry is marked Lost with this reason. This can't be undone."
        confirmLabel="Cancel order"
        danger
        onClose={() => setDialog(null)}
        onConfirm={async (reason) => {
          await postJson(`/api/orders/${order.id}/status`, { action: "cancel", reason });
          setDialog(null);
          onDone("Order cancelled");
          router.refresh();
        }}
      />
      {accounts && (
        <OrderDetailsDialog
          order={order}
          open={dialog === "details"}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            onDone("Order details saved");
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

const fieldClass =
  "h-10 w-full rounded-control border border-input bg-card px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-3 focus:ring-primary/15";

const toDateInput = (v: string | Date | null | undefined) => (v ? new Date(v).toISOString().slice(0, 10) : "");

/** Accounts: job no, actual cost / profit (enquiry orders), invoice date and due date / credit days. */
function OrderDetailsDialog({ order, open, onClose, onSaved }: { order: OrderListItem; open: boolean; onClose: () => void; onSaved: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      {open && (
        <DialogContent title={`Order details · #${String(order.id).padStart(5, "0")}`} description={`${order.client?.name ?? ""} · ${order.from} → ${order.to}`}>
          <DetailsForm order={order} onClose={onClose} onSaved={onSaved} />
        </DialogContent>
      )}
    </Dialog>
  );
}

function DetailsForm({ order, onClose, onSaved }: { order: OrderListItem; onClose: () => void; onSaved: () => void }) {
  const q = order.quote;
  const isCredit = order.payment_mode === "credit";
  const [form, setForm] = useState({
    job_no: order.job_no ?? "",
    actual_cost: String(q?.actual_cost ?? q?.cost ?? ""),
    actual_profit: String(q?.actual_profit ?? q?.profit ?? ""),
    invoice_date: toDateInput(order.invoice_date) || new Date().toISOString().slice(0, 10),
    credit_days: q?.credit_days != null ? String(q.credit_days) : "",
    due_date: toDateInput(order.due_date),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const total = (Number(form.actual_cost) || 0) + (Number(form.actual_profit) || 0);
  const creditDue =
    isCredit && form.invoice_date && form.credit_days !== "" && Number.isInteger(Number(form.credit_days))
      ? new Date(new Date(`${form.invoice_date}T00:00:00Z`).getTime() + Number(form.credit_days) * 86_400_000).toISOString().slice(0, 10)
      : null;

  const field = (key: keyof typeof form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className={fieldClass} {...props} />
    </label>
  );

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
          await postJson(
            `/api/orders/${order.id}`,
            {
              job_no: form.job_no,
              actual_cost: q ? form.actual_cost : undefined,
              actual_profit: q ? form.actual_profit : undefined,
              invoice_date: form.invoice_date,
              ...(isCredit ? { credit_days: form.credit_days } : { due_date: form.due_date || undefined }),
            },
            "PATCH",
          );
          onSaved();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to save");
        } finally {
          setSaving(false);
        }
      }}
    >
      <DialogBody className="space-y-4">
        {error && <p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-sm text-danger-foreground">{error}</p>}
        {field("job_no", "Job no", { required: true, placeholder: "e.g. JOB-2026-001", autoFocus: true })}
        {q && (
          <div className="grid gap-4 sm:grid-cols-2">
            {field("actual_cost", "Actual cost", { type: "number", min: "0", step: "0.01", required: true })}
            {field("actual_profit", "Actual profit", { type: "number", step: "0.01", required: true })}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {field("invoice_date", "Invoice date", { type: "date", required: true })}
          {isCredit
            ? field("credit_days", "Credit days", { type: "number", min: "0", step: "1", required: true })
            : field("due_date", "Due date (optional)", { type: "date", min: form.invoice_date || undefined })}
        </div>
        {isCredit && (
          <p className="-mt-2 text-xs text-muted-foreground">
            {creditDue ? <>Payment due on <span className="font-medium text-foreground">{formatDate(creditDue)}</span>.</> : "Enter credit days to set the due date."}
          </p>
        )}
        {q && (
          <div className="flex items-center justify-between rounded-control bg-subtle px-3 py-2.5 text-sm">
            <span className="text-muted-foreground">Order amount (cost + profit)</span>
            <span className="font-semibold tabular-nums text-foreground">{formatAmount(total)}</span>
          </div>
        )}
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button type="submit" loading={saving}>Save details</Button>
      </DialogFooter>
    </form>
  );
}
