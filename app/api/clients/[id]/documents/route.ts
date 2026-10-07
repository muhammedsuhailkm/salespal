import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { getTokenUserId, isRole } from "@/lib/scoping";
import { parseDateOnly } from "@/lib/salesman-targets";
import { removeDocumentFile, storeUploadedFile, validateDocumentFile } from "@/lib/company-documents";
import {
  CLIENT_DOCUMENT_EDITOR_ROLES,
  MAX_CLIENT_DOCUMENTS_PER_UPLOAD,
  findScopedClient,
  getClientDocuments,
  serializeClientDocument,
} from "@/lib/client-documents";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Params) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const client = await findScopedClient(token, Number((await context.params).id));
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  return NextResponse.json({ documents: await getClientDocuments(client.id) });
}

/**
 * Attach documents to a client. Multipart: description, expiry_date?, file (one or more).
 * Each file becomes its own document sharing the description and expiry.
 */
export async function POST(request: NextRequest, context: Params) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRole(token, CLIENT_DOCUMENT_EDITOR_ROLES)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const client = await findScopedClient(token, Number((await context.params).id));
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const form = await request.formData();
  const description = String(form.get("description") ?? "").trim();
  const expiryRaw = String(form.get("expiry_date") ?? "").trim();
  const files = form.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);

  if (!description) return NextResponse.json({ error: "Description is required" }, { status: 400 });
  const expiry = expiryRaw ? parseDateOnly(expiryRaw) : null;
  if (expiryRaw && !expiry) return NextResponse.json({ error: "Invalid expiry date" }, { status: 400 });
  if (files.length === 0) return NextResponse.json({ error: "Attach at least one file" }, { status: 400 });
  if (files.length > MAX_CLIENT_DOCUMENTS_PER_UPLOAD) {
    return NextResponse.json({ error: `Upload up to ${MAX_CLIENT_DOCUMENTS_PER_UPLOAD} files at a time` }, { status: 400 });
  }
  for (const file of files) {
    const fileError = validateDocumentFile(file);
    if (fileError) return NextResponse.json({ error: `${file.name}: ${fileError}` }, { status: 400 });
  }

  const stored = [];
  try {
    for (const file of files) stored.push(await storeUploadedFile(`clients/${client.id}`, file));
    const docs = await prisma.$transaction(
      stored.map((s) =>
        prisma.clientDocument.create({
          data: { client_id: client.id, description: description.slice(0, 200), expiry_date: expiry, uploaded_by_id: getTokenUserId(token), ...s },
          include: { uploadedBy: { select: { name: true } } },
        }),
      ),
    );
    return NextResponse.json({ documents: docs.map(serializeClientDocument) }, { status: 201 });
  } catch {
    await Promise.all(stored.map((s) => removeDocumentFile(s.file_path)));
    return NextResponse.json({ error: "Failed to save the documents. Please try again." }, { status: 500 });
  }
}
