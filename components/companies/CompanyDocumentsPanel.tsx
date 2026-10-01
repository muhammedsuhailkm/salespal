"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Download, Eye, FileText, Paperclip, Pencil, Plus, RefreshCw, Trash2, Upload, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { cn, formatDate } from "@/lib/utils";
import {
  COMPANY_DOCUMENT_ACCEPT,
  COMPANY_DOCUMENT_MAX_BYTES,
  companyDocumentLabels,
  documentExpiryState,
  formatFileSize,
  type CompanyDocumentItem,
} from "@/types/company";
import { DocumentExpiryBadge } from "@/components/companies/DocumentExpiryBadge";

const fieldClass =
  "h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none transition focus:border-blue-950 focus:ring-2 focus:ring-blue-950/10";
const labelClass = "text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1";

type ModalState = { mode: "add" } | { mode: "edit"; doc: CompanyDocumentItem; renew: boolean } | null;

const fileUrl = (orgId: number, docId: number, download = false) =>
  `/api/companies/${orgId}/documents/${docId}${download ? "?download=1" : ""}`;

/** Company paperwork (CR copy, export license, ...) with expiry tracking and file replacement. */
export function CompanyDocumentsPanel({
  orgId,
  orgName,
  documents,
  labelClass: sectionLabelClass,
  openUploadOnMount = false,
  onUploadPromptHandled,
}: {
  orgId: number;
  orgName: string;
  documents: CompanyDocumentItem[];
  labelClass: string;
  openUploadOnMount?: boolean;
  onUploadPromptHandled?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modal, setModal] = useState<ModalState>(openUploadOnMount ? { mode: "add" } : null);

  const attention = documents.filter((d) => {
    const state = documentExpiryState(d.expiry_date);
    return state === "expired" || state === "expiring";
  }).length;

  const closeModal = () => {
    setModal(null);
    onUploadPromptHandled?.();
  };

  const handleDelete = (doc: CompanyDocumentItem) => {
    if (!confirm(`Delete "${doc.label}" from ${orgName}? The file will be removed permanently.`)) return;
    startTransition(async () => {
      const res = await fetch(`/api/companies/${orgId}/documents/${doc.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error ?? "Failed to delete document.");
        return;
      }
      router.refresh();
    });
  };

  return (
    <section className="space-y-3" aria-label={`Documents for ${orgName}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className={`text-xs font-bold uppercase tracking-wider ${sectionLabelClass}`}>Documents ({documents.length})</h3>
          {attention > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
              <AlertTriangle size={10} aria-hidden /> {attention} need{attention === 1 ? "s" : ""} renewal
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {documents.length > 0 && (
            <a
              href={`/api/companies/${orgId}/documents/export`}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              <Download size={12} /> Download all
            </a>
          )}
          <button
            type="button"
            onClick={() => setModal({ mode: "add" })}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <Plus size={12} /> Add document
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/70 bg-white p-3 space-y-2">
        {documents.map((doc) => {
          const state = documentExpiryState(doc.expiry_date);
          const needsRenewal = state === "expired" || state === "expiring";
          return (
            <div
              key={doc.id}
              className={cn(
                "rounded-xl border p-3 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between",
                state === "expired" ? "border-rose-200 bg-rose-50/40" : state === "expiring" ? "border-amber-200 bg-amber-50/30" : "border-slate-100"
              )}
            >
              <div className="flex min-w-0 items-start gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <FileText size={15} aria-hidden />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-xs font-bold text-slate-800">{doc.label}</p>
                    <DocumentExpiryBadge expiryDate={doc.expiry_date} />
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {doc.doc_number ? <>No. {doc.doc_number} · </> : null}
                    {doc.expiry_date ? <>Expires {formatDate(doc.expiry_date)}</> : <>No expiry</>}
                  </p>
                  <p className="truncate text-[10px] text-slate-400" title={doc.file_name}>
                    <Paperclip size={9} className="inline -mt-0.5 mr-0.5" aria-hidden />
                    {doc.file_name} · {formatFileSize(doc.size_bytes)} · by {doc.uploaded_by}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
                {needsRenewal && (
                  <button
                    type="button"
                    onClick={() => setModal({ mode: "edit", doc, renew: true })}
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-950 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-blue-900 transition cursor-pointer"
                  >
                    <RefreshCw size={11} aria-hidden /> Renew
                  </button>
                )}
                <a
                  href={fileUrl(orgId, doc.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`View ${doc.label}`}
                  title="View"
                  className="rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <Eye size={14} />
                </a>
                <a
                  href={fileUrl(orgId, doc.id, true)}
                  aria-label={`Download ${doc.label}`}
                  title="Download"
                  className="rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <Download size={14} />
                </a>
                <button
                  type="button"
                  onClick={() => setModal({ mode: "edit", doc, renew: false })}
                  aria-label={`Edit ${doc.label}`}
                  title="Edit / replace file"
                  className="rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(doc)}
                  disabled={isPending}
                  aria-label={`Delete ${doc.label}`}
                  title="Delete"
                  className="rounded p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}

        {documents.length === 0 && (
          <button
            type="button"
            onClick={() => setModal({ mode: "add" })}
            className="flex w-full flex-col items-center gap-1 rounded-xl border border-dashed border-slate-200 py-5 text-center transition hover:bg-slate-50 cursor-pointer"
          >
            <Upload size={18} className="text-slate-300" aria-hidden />
            <span className="text-[11px] font-semibold text-slate-500">No documents yet</span>
            <span className="text-[10px] text-slate-400">Upload the CR copy, export license and other paperwork</span>
          </button>
        )}
      </div>

      <DocumentFormModal orgId={orgId} orgName={orgName} state={modal} onClose={closeModal} />
    </section>
  );
}

function DocumentFormModal({
  orgId,
  orgName,
  state,
  onClose,
}: {
  orgId: number;
  orgName: string;
  state: ModalState;
  onClose: () => void;
}) {
  return (
    <Modal open={state !== null}>
      {state && (
        <DocumentForm
          key={state.mode === "edit" ? `${state.doc.id}-${state.renew}` : "add"}
          orgId={orgId}
          orgName={orgName}
          state={state}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}

function DocumentForm({
  orgId,
  orgName,
  state,
  onClose,
}: {
  orgId: number;
  orgName: string;
  state: NonNullable<ModalState>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const editing = state.mode === "edit" ? state.doc : null;
  const renew = state.mode === "edit" && state.renew;
  const [label, setLabel] = useState(editing?.label ?? "");
  const [docNumber, setDocNumber] = useState(editing?.doc_number ?? "");
  // Renewing: the old expiry no longer applies, so ask for the new one.
  const [expiry, setExpiry] = useState(renew ? "" : editing?.expiry_date ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const handleFile = (f: File | null) => {
    if (f && f.size > COMPANY_DOCUMENT_MAX_BYTES) {
      setError("Files must be 10 MB or smaller.");
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    setError("");
    setFile(f);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return setError("Document name is required.");
    if (!editing && !file) return setError("Choose a file to upload.");
    if (renew && !file) return setError("Upload the renewed document.");
    setError("");

    const form = new FormData();
    form.set("label", label.trim());
    form.set("doc_number", docNumber.trim());
    form.set("expiry_date", expiry);
    if (file) form.set("file", file);

    startTransition(async () => {
      const res = await fetch(
        editing ? `/api/companies/${orgId}/documents/${editing.id}` : `/api/companies/${orgId}/documents`,
        { method: editing ? "PATCH" : "POST", body: form }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Upload failed. Please try again.");
        return;
      }
      router.refresh();
      onClose();
    });
  };

  const title = renew ? `Renew ${editing!.label}` : editing ? `Edit ${editing.label}` : `Add Document to ${orgName}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-blue-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-50 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div role="alert" className="p-2.5 rounded-lg bg-rose-50 border border-rose-100 text-xs font-medium text-rose-700">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label htmlFor="doc-label" className={labelClass}>
              Document
            </label>
            <input
              id="doc-label"
              type="text"
              list="company-document-labels"
              required
              placeholder="e.g. CR Copy"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className={fieldClass}
            />
            <datalist id="company-document-labels">
              {companyDocumentLabels.map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
            {!editing && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {companyDocumentLabels.slice(0, 4).map((l) => (
                  <button
                    type="button"
                    key={l}
                    onClick={() => setLabel(l)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[10px] font-semibold transition cursor-pointer",
                      label === l ? "border-blue-950 bg-blue-950 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="doc-number" className={labelClass}>
                Document No. (Optional)
              </label>
              <input
                id="doc-number"
                type="text"
                placeholder="e.g. 1234567"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="doc-expiry" className={labelClass}>
                {renew ? "New Expiry Date" : "Expiry Date (Optional)"}
              </label>
              <input
                id="doc-expiry"
                type="date"
                required={renew}
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="doc-file" className={labelClass}>
              {editing ? (renew ? "Renewed File" : "Replace File (Optional)") : "File"}
            </label>
            <input
              id="doc-file"
              ref={fileInput}
              type="file"
              accept={COMPANY_DOCUMENT_ACCEPT}
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-bold file:text-slate-700 hover:file:bg-slate-200 file:cursor-pointer"
            />
            <p className="mt-1 text-[10px] text-slate-400">
              {editing && !file ? <>Current file: {editing.file_name}. </> : null}
              PDF, image, Word or Excel · up to 10 MB
            </p>
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer bg-blue-950 hover:bg-blue-900 text-white disabled:opacity-60"
          >
            {isPending ? "Saving..." : editing ? "Save" : "Upload"}
          </button>
        </div>
    </form>
  );
}
