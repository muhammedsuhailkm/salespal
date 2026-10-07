"use client";

import { useState } from "react";
import { Loader2, MessageSquareText, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { formatDate } from "@/lib/utils";
import { isActiveEnquiry, type EnquiryListItem } from "@/types/enquiry";

import { buttonVariants } from "@/components/ui/Button";
const textareaClass =
  "w-full rounded-md border border-border-strong bg-card p-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20";

const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso));

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function ModalHeader({ title, subtitle, onClose }: { title: string; subtitle: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between border-b border-border pb-3">
      <div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <button type="button" onClick={onClose} aria-label="Close" className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
        <X size={16} />
      </button>
    </div>
  );
}

/** Follow-up history for an enquiry, with a form to log a new follow-up while it is open. */
export function FollowUpModal({
  enquiry,
  canAdd,
  onClose,
  onSaved,
}: {
  enquiry: EnquiryListItem | null;
  canAdd: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <Modal open={!!enquiry} onClose={onClose}>
      {enquiry && <FollowUpForm key={enquiry.id} enquiry={enquiry} canAdd={canAdd} onClose={onClose} onSaved={onSaved} />}
    </Modal>
  );
}

function FollowUpForm({
  enquiry,
  canAdd,
  onClose,
  onSaved,
}: {
  enquiry: EnquiryListItem;
  canAdd: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isOpen = isActiveEnquiry(enquiry.status);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return setError("Write a follow-up comment.");
    setSaving(true);
    setError(null);
    try {
      await postJson(`/api/enquiries/${enquiry.id}/follow-ups`, { comment });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <ModalHeader
        title={`Follow-ups · ${enquiry.ref}`}
        subtitle={`${enquiry.client_name} · ${enquiry.from} → ${enquiry.to} · raised ${formatDate(enquiry.enquiry_date)}`}
        onClose={onClose}
      />

      {enquiry.status === "lost" && (
        <div className="rounded-lg border border-danger/30 bg-danger-soft p-3 text-xs text-danger-foreground">
          <p className="font-semibold">
            Marked lost{enquiry.cancelled_by ? ` by ${enquiry.cancelled_by}` : ""}
            {enquiry.cancelled_at ? ` on ${formatDate(enquiry.cancelled_at)}` : ""}
          </p>
          <p className="mt-1 whitespace-pre-wrap">{enquiry.cancel_reason}</p>
        </div>
      )}

      {canAdd && isOpen && (
        <form onSubmit={submit} className="space-y-3">
          {enquiry.follow_up_due && (
            <p className="rounded-lg border border-warning/30 bg-warning-soft px-3 py-2 text-xs font-medium text-warning-foreground">
              This enquiry has been open for over 30 days. Logging a follow-up completes the follow-up task.
            </p>
          )}
          {error && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-xs font-medium text-danger-foreground">{error}</p>}
          <label htmlFor="follow-up-comment" className="block text-sm font-medium text-foreground/85">
            <span className="mb-1 block">Follow-up comment</span>
            <textarea
              id="follow-up-comment"
              rows={3}
              autoFocus
              maxLength={2000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g. Called the client — waiting on their final volume, will confirm next week."
              className={textareaClass}
            />
          </label>
          <div className="flex justify-end">
            <button type="submit" disabled={saving} className={buttonVariants({ size: "sm" })}>
              {saving && <Loader2 size={12} className="animate-spin" />}
              Save follow-up
            </button>
          </div>
        </form>
      )}

      <section aria-label="Follow-up history" className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground">History ({enquiry.follow_ups.length})</h4>
        {enquiry.follow_ups.length === 0 ? (
          <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-border py-5 text-center">
            <MessageSquareText size={18} className="text-muted-foreground/60" aria-hidden />
            <p className="text-xs text-muted-foreground/80">No follow-ups logged yet.</p>
          </div>
        ) : (
          <ol className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
            {enquiry.follow_ups.map((f) => (
              <li key={f.id} className="rounded-lg border border-border bg-subtle/60 p-3">
                <p className="whitespace-pre-wrap text-sm text-foreground">{f.comment}</p>
                <p className="mt-1 text-[11px] text-muted-foreground/80">
                  {f.by} · {formatDateTime(f.at)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
