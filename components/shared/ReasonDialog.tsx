"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog";

/** Asks for a mandatory reason before a destructive / workflow-reversing action. */
export function ReasonDialog({
  open,
  title,
  description,
  confirmLabel,
  danger = false,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  danger?: boolean;
  onClose: () => void;
  /** Throw to show the error inline. */
  onConfirm: (reason: string) => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      {open && (
        <DialogContent title={title} description={description}>
          <ReasonForm confirmLabel={confirmLabel} danger={danger} onClose={onClose} onConfirm={onConfirm} />
        </DialogContent>
      )}
    </Dialog>
  );
}

function ReasonForm({ confirmLabel, danger, onClose, onConfirm }: { confirmLabel: string; danger: boolean; onClose: () => void; onConfirm: (reason: string) => Promise<void> }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
          await onConfirm(reason.trim());
        } catch (err) {
          setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
          setSaving(false);
        }
      }}
    >
      <DialogBody className="space-y-3">
        {error && <p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-sm text-danger-foreground">{error}</p>}
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">Reason</span>
          <textarea
            required
            minLength={5}
            autoFocus
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-control border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 hover:border-border-strong focus:border-ring focus:ring-3 focus:ring-ring/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 w-full py-2.5"
            placeholder="At least 5 characters"
          />
        </label>
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Back</Button>
        <Button type="submit" variant={danger ? "danger" : "primary"} loading={saving}>{confirmLabel}</Button>
      </DialogFooter>
    </form>
  );
}
