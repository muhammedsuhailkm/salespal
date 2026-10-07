import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { getTokenUserId, isRole } from "@/lib/scoping";
import { parseDateOnly } from "@/lib/salesman-targets";
import { readDocumentFile, removeDocumentFile, storeUploadedFile, validateDocumentFile } from "@/lib/company-documents";
import { CLIENT_DOCUMENT_EDITOR_ROLES, canDeleteClientDocument, findScopedClient, serializeClientDocument } from "@/lib/client-documents";

type Params = { params: Promise<{ id: string; docId: string }> };

async function load(request: NextRequest, context: Params) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  const { id, docId } = await context.params;
  const client = await findScopedClient(token, Number(id));
  const doc = client ? await prisma.clientDocument.findFirst({ where: { id: Number(docId), client_id: client.id } }) : null;
  if (!doc) return { error: NextResponse.json({ error: "Document not found" }, { status: 404 }) } as const;
  return { token, doc } as const;
}

/** View inline, or download with ?download=1. */
export async function GET(request: NextRequest, context: Params) {
  const found = await load(request, context);
  if ("error" in found) return found.error;
  const { doc } = found;

  let data: Buffer;
  try {
    data = await readDocumentFile(doc.file_path);
  } catch {
    return NextResponse.json({ error: "The stored file is missing. Upload it again." }, { status: 410 });
  }
  const disposition = new URL(request.url).searchParams.get("download") ? "attachment" : "inline";
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

/** Edit description / expiry, optionally replacing the file. Multipart: description, expiry_date?, file?. */
export async function PATCH(request: NextRequest, context: Params) {
  const found = await load(request, context);
  if ("error" in found) return found.error;
  const { token, doc } = found;
  if (!isRole(token, CLIENT_DOCUMENT_EDITOR_ROLES)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const form = await request.formData();
  const description = String(form.get("description") ?? "").trim();
  const expiryRaw = String(form.get("expiry_date") ?? "").trim();
  const file = form.get("file");
  if (!description) return NextResponse.json({ error: "Description is required" }, { status: 400 });
  const expiry = expiryRaw ? parseDateOnly(expiryRaw) : null;
  if (expiryRaw && !expiry) return NextResponse.json({ error: "Invalid expiry date" }, { status: 400 });

  let stored: Awaited<ReturnType<typeof storeUploadedFile>> | null = null;
  if (file instanceof File && file.size > 0) {
    const fileError = validateDocumentFile(file);
    if (fileError) return NextResponse.json({ error: fileError }, { status: 400 });
    stored = await storeUploadedFile(`clients/${doc.client_id}`, file);
  }

  try {
    const updated = await prisma.clientDocument.update({
      where: { id: doc.id },
      data: {
        description: description.slice(0, 200),
        expiry_date: expiry,
        ...(stored ? { ...stored, uploaded_by_id: getTokenUserId(token) } : {}),
      },
      include: { uploadedBy: { select: { name: true } } },
    });
    if (stored) await removeDocumentFile(doc.file_path);
    return NextResponse.json({ document: serializeClientDocument(updated) });
  } catch {
    if (stored) await removeDocumentFile(stored.file_path);
    return NextResponse.json({ error: "Failed to save the document. Please try again." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: Params) {
  const found = await load(request, context);
  if ("error" in found) return found.error;
  const { token, doc } = found;
  if (!canDeleteClientDocument({ id: getTokenUserId(token), role_id: Number(token.role_id) }, doc)) {
    return NextResponse.json({ error: "Only the uploader or a manager can delete this document" }, { status: 403 });
  }
  await prisma.clientDocument.delete({ where: { id: doc.id } });
  await removeDocumentFile(doc.file_path);
  return NextResponse.json({ ok: true });
}
