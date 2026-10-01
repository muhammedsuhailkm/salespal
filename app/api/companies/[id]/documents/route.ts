import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSalesPalSession } from "@/lib/auth";
import { parseDateOnly } from "@/lib/salesman-targets";
import { removeDocumentFile, serializeCompanyDocument, storeDocumentFile, validateDocumentFile } from "@/lib/company-documents";

/** Owner uploads a company document (multipart: label, doc_number?, expiry_date?, file). */
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSalesPalSession();
  if (!session || session.user.role_id !== 1) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const orgId = Number(id);
  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { id: true } });
  if (!org) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const form = await req.formData();
  const label = String(form.get("label") ?? "").trim();
  const docNumber = String(form.get("doc_number") ?? "").trim();
  const expiryRaw = String(form.get("expiry_date") ?? "").trim();
  const file = form.get("file");

  if (!label) return NextResponse.json({ error: "Document name is required" }, { status: 400 });
  const expiry = expiryRaw ? parseDateOnly(expiryRaw) : null;
  if (expiryRaw && !expiry) return NextResponse.json({ error: "Invalid expiry date" }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ error: "Attach a file" }, { status: 400 });
  const fileError = validateDocumentFile(file);
  if (fileError) return NextResponse.json({ error: fileError }, { status: 400 });

  const stored = await storeDocumentFile(orgId, file);
  let doc;
  try {
    doc = await prisma.companyDocument.create({
      data: {
        org_id: orgId,
        label: label.slice(0, 120),
        doc_number: docNumber || null,
        expiry_date: expiry,
        uploaded_by_id: Number(session.user.id),
        ...stored,
      },
      include: { uploadedBy: { select: { name: true } } },
    });
  } catch {
    await removeDocumentFile(stored.file_path);
    return NextResponse.json({ error: "Failed to save the document. Please try again." }, { status: 500 });
  }

  revalidateTag("admin-companies", { expire: 0 });
  revalidatePath("/dashboard/admin/companies");
  return NextResponse.json({ success: true, data: serializeCompanyDocument(doc) });
}
