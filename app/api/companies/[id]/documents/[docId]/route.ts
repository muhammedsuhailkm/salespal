import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSalesPalSession } from "@/lib/auth";
import { parseDateOnly } from "@/lib/salesman-targets";
import {
  canViewCompanyDocuments,
  readDocumentFile,
  removeDocumentFile,
  serializeCompanyDocument,
  storeDocumentFile,
  validateDocumentFile,
} from "@/lib/company-documents";

type Params = { params: Promise<{ id: string; docId: string }> };

async function findDocument(context: Params) {
  const { id, docId } = await context.params;
  return prisma.companyDocument.findFirst({ where: { id: Number(docId), org_id: Number(id) } });
}

function revalidateCompanies() {
  revalidateTag("admin-companies", { expire: 0 });
  revalidatePath("/dashboard/admin/companies");
}

/** View (inline) or download (?download=1) a document. Owner, or a manager / accountant of that company. */
export async function GET(req: Request, context: Params) {
  const session = await getSalesPalSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doc = await findDocument(context);
  if (!doc || !(await canViewCompanyDocuments({ id: Number(session.user.id), role_id: session.user.role_id }, doc.org_id))) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  let data: Buffer;
  try {
    data = await readDocumentFile(doc.file_path);
  } catch {
    return NextResponse.json({ error: "The stored file is missing. Upload it again." }, { status: 410 });
  }

  const disposition = new URL(req.url).searchParams.get("download") ? "attachment" : "inline";
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": doc.mime_type,
      "Content-Length": String(data.length),
      "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(doc.file_name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/**
 * Owner edits a document's details and/or replaces its file (e.g. a renewed CR copy).
 * Multipart: label, doc_number?, expiry_date?, file? — the old file is removed when a new one is uploaded.
 */
export async function PATCH(req: Request, context: Params) {
  const session = await getSalesPalSession();
  if (!session || session.user.role_id !== 1) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const doc = await findDocument(context);
  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const form = await req.formData();
  const label = String(form.get("label") ?? "").trim();
  const docNumber = String(form.get("doc_number") ?? "").trim();
  const expiryRaw = String(form.get("expiry_date") ?? "").trim();
  const file = form.get("file");

  if (!label) return NextResponse.json({ error: "Document name is required" }, { status: 400 });
  const expiry = expiryRaw ? parseDateOnly(expiryRaw) : null;
  if (expiryRaw && !expiry) return NextResponse.json({ error: "Invalid expiry date" }, { status: 400 });

  let stored: Awaited<ReturnType<typeof storeDocumentFile>> | null = null;
  if (file instanceof File && file.size > 0) {
    const fileError = validateDocumentFile(file);
    if (fileError) return NextResponse.json({ error: fileError }, { status: 400 });
    stored = await storeDocumentFile(doc.org_id, file);
  }

  let updated;
  try {
    updated = await prisma.companyDocument.update({
      where: { id: doc.id },
      data: {
        label: label.slice(0, 120),
        doc_number: docNumber || null,
        expiry_date: expiry,
        ...(stored ? { ...stored, uploaded_by_id: Number(session.user.id) } : {}),
      },
      include: { uploadedBy: { select: { name: true } } },
    });
  } catch {
    if (stored) await removeDocumentFile(stored.file_path);
    return NextResponse.json({ error: "Failed to save the document. Please try again." }, { status: 500 });
  }
  if (stored) await removeDocumentFile(doc.file_path);

  revalidateCompanies();
  return NextResponse.json({ success: true, data: serializeCompanyDocument(updated) });
}

export async function DELETE(_req: Request, context: Params) {
  const session = await getSalesPalSession();
  if (!session || session.user.role_id !== 1) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const doc = await findDocument(context);
  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  await prisma.companyDocument.delete({ where: { id: doc.id } });
  await removeDocumentFile(doc.file_path);

  revalidateCompanies();
  return NextResponse.json({ success: true });
}
