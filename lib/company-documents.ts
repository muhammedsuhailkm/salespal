import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getAccountantOrgIds, getManagerOrgIds, getSalesmanOrgIds } from "@/lib/scoping";
import { COMPANY_DOCUMENT_MAX_BYTES, companyDocumentMimeTypes, type CompanyDocumentItem } from "@/types/company";

/** Uploaded files live outside public/ and are only served through the authenticated documents API. */
const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

function resolveStoredPath(relativePath: string) {
  const full = path.resolve(UPLOAD_ROOT, relativePath);
  if (!full.startsWith(UPLOAD_ROOT + path.sep)) throw new Error("Invalid file path");
  return full;
}

/** Returns an error message, or null when the file is acceptable. */
export function validateDocumentFile(file: File) {
  if (file.size === 0) return "The selected file is empty.";
  if (file.size > COMPANY_DOCUMENT_MAX_BYTES) return "Files must be 10 MB or smaller.";
  const ext = path.extname(file.name).slice(1).toLowerCase();
  if (!companyDocumentMimeTypes[ext]) return "Unsupported file type. Upload a PDF, image, Word or Excel file.";
  return null;
}

export async function storeDocumentFile(orgId: number, file: File) {
  const ext = path.extname(file.name).slice(1).toLowerCase();
  const relativePath = path.join("companies", String(orgId), `${randomUUID()}.${ext}`);
  const full = resolveStoredPath(relativePath);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, Buffer.from(await file.arrayBuffer()));
  return {
    file_path: relativePath,
    file_name: path.basename(file.name).slice(0, 255),
    mime_type: companyDocumentMimeTypes[ext],
    size_bytes: file.size,
  };
}

export function readDocumentFile(relativePath: string) {
  return readFile(resolveStoredPath(relativePath));
}

/** Best effort — a missing file must not block removing the database row. */
export async function removeDocumentFile(relativePath: string) {
  try {
    await unlink(resolveStoredPath(relativePath));
  } catch {
    // already gone
  }
}

/** Companies whose details and documents the user can see. `null` = every company (owner). */
export async function getVisibleCompanyIds(user: { id: number; role_id: number }): Promise<number[] | null> {
  if (user.role_id === 1) return null;
  if (user.role_id === 2) return getManagerOrgIds(user.id);
  if (user.role_id === 3) return getSalesmanOrgIds(user.id);
  if (user.role_id === 4) return getAccountantOrgIds(user.id);
  return [];
}

/** Owner: every company. Managers / accountants: companies they are assigned to. Salesmen: their managers' companies. */
export async function canViewCompanyDocuments(user: { id: number; role_id: number }, orgId: number) {
  const ids = await getVisibleCompanyIds(user);
  return ids === null || ids.includes(orgId);
}

export type CompanyProfile = {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  documents: CompanyDocumentItem[];
};

/** Company details + documents for the given companies, in one query. */
export async function getCompanyProfiles(orgIds: number[]): Promise<CompanyProfile[]> {
  if (orgIds.length === 0) return [];
  const orgs = await prisma.organization.findMany({
    where: { id: { in: orgIds } },
    select: {
      id: true,
      name: true,
      address: true,
      phone: true,
      email: true,
      documents: { include: { uploadedBy: { select: { name: true } } }, orderBy: [{ label: "asc" }, { id: "asc" }] },
    },
    orderBy: { name: "asc" },
  });
  return orgs.map((org) => ({ ...org, documents: org.documents.map(serializeCompanyDocument) }));
}

export function serializeCompanyDocument(doc: {
  id: number;
  label: string;
  doc_number: string | null;
  expiry_date: Date | null;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  updated_at: Date;
  uploadedBy: { name: string };
}): CompanyDocumentItem {
  return {
    id: doc.id,
    label: doc.label,
    doc_number: doc.doc_number,
    expiry_date: doc.expiry_date ? doc.expiry_date.toISOString().slice(0, 10) : null,
    file_name: doc.file_name,
    mime_type: doc.mime_type,
    size_bytes: doc.size_bytes,
    uploaded_by: doc.uploadedBy.name,
    updated_at: doc.updated_at.toISOString(),
  };
}
