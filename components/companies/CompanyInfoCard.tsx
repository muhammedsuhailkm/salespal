import { Building, Download, Eye, FileText, FolderDown, Mail, MapPin, Phone } from "lucide-react";
import { DocumentExpiryBadge } from "@/components/companies/DocumentExpiryBadge";
import { formatDate } from "@/lib/utils";
import type { CompanyProfile } from "@/lib/company-documents";
import { findCrDocument, formatFileSize } from "@/types/company";

const docUrl = (orgId: number, docId: number, download = false) =>
  `/api/companies/${orgId}/documents/${docId}${download ? "?download=1" : ""}`;

/** Read-only company profile (name, CR, contacts) with its documents for viewing / downloading. */
export function CompanyInfoCard({ company }: { company: CompanyProfile }) {
  const cr = findCrDocument(company.documents);

  return (
    <section aria-label={`${company.name} company details`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-950 text-white">
            <Building size={18} aria-hidden />
          </div>
          <div className="min-w-0 space-y-1.5">
            <h2 className="text-lg font-bold tracking-tight text-slate-900">{company.name}</h2>
            <dl className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <dt className="font-semibold uppercase tracking-wide text-slate-400">CR No.</dt>
              <dd className="font-mono font-semibold text-slate-800">{cr?.doc_number ?? <span className="font-sans font-normal italic text-slate-400">Not on file</span>}</dd>
              {cr?.expiry_date && (
                <dd className="flex items-center gap-1.5 text-slate-500">
                  · expires {formatDate(cr.expiry_date)} <DocumentExpiryBadge expiryDate={cr.expiry_date} />
                </dd>
              )}
            </dl>
            {(company.address || company.phone || company.email) && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                {company.address && (
                  <span className="inline-flex items-center gap-1"><MapPin size={12} aria-hidden /> {company.address}</span>
                )}
                {company.phone && (
                  <a href={`tel:${company.phone}`} className="inline-flex items-center gap-1 hover:text-slate-800"><Phone size={12} aria-hidden /> {company.phone}</a>
                )}
                {company.email && (
                  <a href={`mailto:${company.email}`} className="inline-flex items-center gap-1 hover:text-slate-800"><Mail size={12} aria-hidden /> {company.email}</a>
                )}
              </div>
            )}
          </div>
        </div>

        {company.documents.length > 0 && (
          <a
            href={`/api/companies/${company.id}/documents/export`}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 self-start rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <FolderDown size={14} aria-hidden />
            Export all documents
          </a>
        )}
      </div>

      <div className="p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Documents ({company.documents.length})</h3>
        {company.documents.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 py-5 text-center text-xs text-slate-400">
            No documents uploaded for this company yet.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {company.documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 p-3">
                <div className="flex min-w-0 items-start gap-2.5">
                  <FileText size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-xs font-bold text-slate-800">{doc.label}</p>
                      <DocumentExpiryBadge expiryDate={doc.expiry_date} />
                    </div>
                    <p className="truncate text-[11px] text-slate-500">
                      {doc.doc_number ? `No. ${doc.doc_number} · ` : ""}
                      {doc.expiry_date ? `Exp. ${formatDate(doc.expiry_date)}` : formatFileSize(doc.size_bytes)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center">
                  <a
                    href={docUrl(company.id, doc.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`View ${doc.label}`}
                    title="View"
                    className="rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    <Eye size={14} />
                  </a>
                  <a
                    href={docUrl(company.id, doc.id, true)}
                    aria-label={`Download ${doc.label}`}
                    title="Download"
                    className="rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    <Download size={14} />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
