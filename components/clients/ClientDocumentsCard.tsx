"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Download, Eye, FileText, Paperclip, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { DocumentExpiryBadge } from "@/components/companies/DocumentExpiryBadge";
import { cn, formatDate } from "@/lib/utils";
import { COMPANY_DOCUMENT_ACCEPT, COMPANY_DOCUMENT_MAX_BYTES, documentExpiryState, formatFileSize } from "@/types/company";
import type { ClientDocumentItem } from "@/types/client";

const MAX_FILES = 10;
const fileUrl = (clientId: number, docId: number, download = false) => `/api/clients/${clientId}/documents/${docId}${download ? "?download=1" : ""}`;

const inputClass =
  "h-10 w-full rounded-control border border-input bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-3 focus:ring-primary/15";

type DialogState = { mode: "add" } | { mode: "edit"; doc: ClientDocumentItem } | null;

/** Attachments on a client: description, optional expiry, any number of files. */
export function ClientDocumentsCard({
  clientId,
  documents,
  currentUser,
}: {
  clientId: number;
  documents: ClientDocumentItem[];
  /** Who is looking: decides whether add / edit / delete are offered (the API enforces the same rules). */
  currentUser: { id: number; role_id: number };
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [deleting, startDelete] = useTransition();
  const canEdit = [1, 2, 3].includes(currentUser.role_id);
  const canDelete = (doc: ClientDocumentItem) => currentUser.role_id === 1 || currentUser.role_id === 2 || doc.uploaded_by_id === currentUser.id;
  const attention = documents.filter((d) => ["expired", "expiring"].includes(documentExpiryState(d.expiry_date))).length;

  function remove(doc: ClientDocumentItem) {
    if (!confirm(`Delete "${doc.description}" (${doc.file_name})? The file is removed permanently.`)) return;
    startDelete(async () => {
      const res = await fetch(fileUrl(clientId, doc.id), { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error ?? "Failed to delete the document.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="rounded-card border border-border bg-card p-6 shadow-card" aria-label="Client documents">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-foreground">Documents ({documents.length})</h2>
          {attention > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-medium text-warning-foreground">
              <AlertTriangle size={11} aria-hidden /> {attention} need{attention === 1 ? "s" : ""} renewal
            </span>
          )}
        </div>
        {canEdit && (
          <Button size="sm" variant="soft" onClick={() => setDialog({ mode: "add" })}>
            <Plus /> Add documents
          </Button>
        )}
      </div>

      {documents.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-control border border-dashed border-border px-4 py-8 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Paperclip size={18} aria-hidden />
          </span>
          <p className="text-sm font-medium text-foreground">No documents yet</p>
          <p className="text-xs text-muted-foreground">Attach agreements, KYC copies, trade licences and other client paperwork.</p>
        </div>
      ) : (
        <ul className={cn("divide-y divide-border", deleting && "opacity-60")}>
          {documents.map((doc) => {
            const state = documentExpiryState(doc.expiry_date);
            return (
              <li key={doc.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <span
                  className={cn(
                    "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[10px]",
                    state === "expired" ? "bg-danger-soft text-danger-foreground" : state === "expiring" ? "bg-warning-soft text-warning-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  <FileText size={16} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-sm font-medium text-foreground">{doc.description}</p>
                    <DocumentExpiryBadge expiryDate={doc.expiry_date} />
                  </div>
                  <a href={fileUrl(clientId, doc.id)} target="_blank" rel="noopener" className="block truncate text-xs text-primary hover:underline">
                    {doc.file_name}
                  </a>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(doc.size_bytes)}
                    {doc.expiry_date && <> · Expires {formatDate(doc.expiry_date)}</>} · {doc.uploaded_by}, {formatDate(doc.created_at)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <SimpleTooltip label="View">
                    <Button asChild size="icon-sm" variant="ghost">
                      <a href={fileUrl(clientId, doc.id)} target="_blank" rel="noopener" aria-label={`View ${doc.file_name}`}>
                        <Eye />
                      </a>
                    </Button>
                  </SimpleTooltip>
                  <SimpleTooltip label="Download">
                    <Button asChild size="icon-sm" variant="ghost">
                      <a href={fileUrl(clientId, doc.id, true)} aria-label={`Download ${doc.file_name}`}>
                        <Download />
                      </a>
                    </Button>
                  </SimpleTooltip>
                  {canEdit && (
                    <SimpleTooltip label="Edit">
                      <Button size="icon-sm" variant="ghost" onClick={() => setDialog({ mode: "edit", doc })} aria-label={`Edit ${doc.description}`}>
                        <Pencil />
                      </Button>
                    </SimpleTooltip>
                  )}
                  {canDelete(doc) && (
                    <SimpleTooltip label="Delete">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="text-muted-foreground hover:bg-danger-soft hover:text-danger-foreground"
                        onClick={() => remove(doc)}
                        disabled={deleting}
                        aria-label={`Delete ${doc.description}`}
                      >
                        <Trash2 />
                      </Button>
                    </SimpleTooltip>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <DocumentDialog
        key={dialog ? (dialog.mode === "edit" ? `edit-${dialog.doc.id}` : "add") : "closed"}
        state={dialog}
        clientId={clientId}
        onClose={() => setDialog(null)}
        onSaved={() => {
          setDialog(null);
          router.refresh();
        }}
      />
    </section>
  );
}

function DocumentDialog({ state, clientId, onClose, onSaved }: { state: DialogState; clientId: number; onClose: () => void; onSaved: () => void }) {
  const editing = state?.mode === "edit" ? state.doc : null;
  const [description, setDescription] = useState(editing?.description ?? "");
  const [expiry, setExpiry] = useState(editing?.expiry_date ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const picked = Array.from(list);
    const tooBig = picked.find((f) => f.size > COMPANY_DOCUMENT_MAX_BYTES);
    if (tooBig) {
      setError(`${tooBig.name} is larger than 10 MB.`);
      return;
    }
    setError(null);
    setFiles((prev) => (editing ? picked.slice(0, 1) : [...prev, ...picked].slice(0, MAX_FILES)));
    if (inputRef.current) inputRef.current.value = "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing && files.length === 0) {
      setError("Choose at least one file.");
      return;
    }
    setSaving(true);
    setError(null);
    const form = new FormData();
    form.set("description", description);
    form.set("expiry_date", expiry);
    for (const f of files) form.append("file", f);
    try {
      const res = await fetch(editing ? fileUrl(clientId, editing.id) : `/api/clients/${clientId}/documents`, { method: editing ? "PATCH" : "POST", body: form });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Upload failed");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!state} onOpenChange={(open) => !open && onClose()}>
      {state && (
        <DialogContent
          title={editing ? "Edit document" : "Add documents"}
          description={editing ? "Change the description or expiry, or replace the file." : "Add one or more files. Each file is saved as its own document with this description and expiry."}
        >
          <form onSubmit={submit}>
            <DialogBody className="space-y-4">
              {error && <p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-sm text-danger-foreground">{error}</p>}
              <label className="block text-sm font-medium text-foreground">
                <span className="mb-1 block">Description</span>
                <input required maxLength={200} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Signed service agreement" className={inputClass} />
              </label>
              <label className="block text-sm font-medium text-foreground">
                <span className="mb-1 block">Expiry date <span className="font-normal text-muted-foreground">(optional)</span></span>
                <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className={inputClass} />
              </label>

              <div>
                <span className="mb-1 block text-sm font-medium text-foreground">
                  {editing ? "Replace file" : "Files"} {editing && <span className="font-normal text-muted-foreground">(optional)</span>}
                </span>
                {editing && files.length === 0 && <p className="mb-2 truncate text-xs text-muted-foreground">Current: {editing.file_name}</p>}
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    addFiles(e.dataTransfer.files);
                  }}
                  className="flex w-full cursor-pointer flex-col items-center gap-1 rounded-control border border-dashed border-border-strong bg-subtle px-4 py-5 text-center transition hover:border-primary hover:bg-primary-soft/40"
                >
                  <Paperclip size={18} className="text-muted-foreground" aria-hidden />
                  <span className="text-sm font-medium text-foreground">{editing ? "Choose a new file" : "Choose files or drop them here"}</span>
                  <span className="text-xs text-muted-foreground">PDF, images, Word or Excel · up to 10 MB each{editing ? "" : ` · max ${MAX_FILES}`}</span>
                </button>
                <input ref={inputRef} type="file" multiple={!editing} accept={COMPANY_DOCUMENT_ACCEPT} className="hidden" onChange={(e) => addFiles(e.target.files)} />
                {files.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {files.map((f, i) => (
                      <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-control border border-border px-3 py-1.5 text-sm">
                        <FileText size={14} className="shrink-0 text-muted-foreground" aria-hidden />
                        <span className="min-w-0 flex-1 truncate text-foreground">{f.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{formatFileSize(f.size)}</span>
                        <button type="button" onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`} className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
                          <X size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
              <Button type="submit" loading={saving}>
                {editing ? "Save changes" : files.length > 1 ? `Upload ${files.length} files` : "Upload"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      )}
    </Dialog>
  );
}
