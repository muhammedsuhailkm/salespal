"use client";

import { useState } from "react";
import { Ban, Loader2, MessageSquareText, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { formatDate } from "@/lib/utils";
import type { EnquiryListItem } from "@/types/enquiry";

const textareaClass =
  "w-full rounded-md border border-slate-300 bg-white p-3 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200";

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
    <div className="flex items-start justify-between border-b border-slate-100 pb-3">
      <div>
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
      <button type="button" onClick={onClose} aria-label="Close" className="cursor-pointer rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
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
    <Modal open={!!enquiry}>
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
  const isOpen = enquiry.status === "open";

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

      {enquiry.status === "cancelled" && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <p className="font-semibold">
            Cancelled{enquiry.cancelled_by ? ` by ${enquiry.cancelled_by}` : ""}
            {enquiry.cancelled_at ? ` on ${formatDate(enquiry.cancelled_at)}` : ""}
          </p>
          <p className="mt-1 whitespace-pre-wrap">{enquiry.cancel_reason}</p>
        </div>
      )}

      {canAdd && isOpen && (
        <form onSubmit={submit} className="space-y-3">
          {enquiry.follow_up_due && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              This enquiry has been open for over 30 days. Logging a follow-up completes the follow-up task.
            </p>
          )}
          {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p>}
          <label htmlFor="follow-up-comment" className="block text-sm font-medium text-slate-700">
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
            <button type="submit" disabled={saving} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50">
              {saving && <Loader2 size={12} className="animate-spin" />}
              Save follow-up
            </button>
          </div>
        </form>
      )}

      <section aria-label="Follow-up history" className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">History ({enquiry.follow_ups.length})</h4>
        {enquiry.follow_ups.length === 0 ? (
          <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-slate-200 py-5 text-center">
            <MessageSquareText size={18} className="text-slate-300" aria-hidden />
            <p className="text-xs text-slate-400">No follow-ups logged yet.</p>
          </div>
        ) : (
          <ol className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
            {enquiry.follow_ups.map((f) => (
              <li key={f.id} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                <p className="whitespace-pre-wrap text-sm text-slate-800">{f.comment}</p>
                <p className="mt-1 text-[11px] text-slate-400">
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

/** Cancel an open enquiry — a reason is required. */
export function CancelEnquiryModal({
  enquiry,
  onClose,
  onCancelled,
}: {
  enquiry: EnquiryListItem | null;
  onClose: () => void;
  onCancelled: () => void;
}) {
  return (
    <Modal open={!!enquiry}>
      {enquiry && <CancelForm key={enquiry.id} enquiry={enquiry} onClose={onClose} onCancelled={onCancelled} />}
    </Modal>
  );
}

function CancelForm({ enquiry, onClose, onCancelled }: { enquiry: EnquiryListItem; onClose: () => void; onCancelled: () => void }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (reason.trim().length < 5) return setError("Give a reason for cancelling (at least 5 characters).");
    setSaving(true);
    setError(null);
    try {
      await postJson(`/api/enquiries/${enquiry.id}/cancel`, { reason });
      onCancelled();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <ModalHeader
        title={`Cancel ${enquiry.ref}?`}
        subtitle={`${enquiry.client_name} · ${enquiry.from} → ${enquiry.to}. A cancelled enquiry can't be converted to an order.`}
        onClose={onClose}
      />
      {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p>}
      <label htmlFor="cancel-reason" className="block text-sm font-medium text-slate-700">
        <span className="mb-1 block">Reason for cancellation</span>
        <textarea
          id="cancel-reason"
          rows={3}
          required
          autoFocus
          maxLength={1000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Client went with another forwarder on price."
          className={textareaClass}
        />
      </label>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
        <button type="button" onClick={onClose} className="cursor-pointer rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
          Keep enquiry
        </button>
        <button type="submit" disabled={saving} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50">
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Ban size={12} />}
          Cancel enquiry
        </button>
      </div>
    </form>
  );
}
