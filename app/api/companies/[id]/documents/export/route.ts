import { NextResponse } from "next/server";
import path from "node:path";
import { zipSync, type Zippable } from "fflate";
import { prisma } from "@/lib/prisma";
import { getSalesPalSession } from "@/lib/auth";
import { canViewCompanyDocuments, readDocumentFile } from "@/lib/company-documents";

const safeName = (value: string) => value.replace(/[\\/:*?"<>|]+/g, "-").trim() || "document";

/** Download every document of a company as one zip. Same access rule as viewing a single document. */
export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSalesPalSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const orgId = Number(id);
  if (!(await canViewCompanyDocuments({ id: Number(session.user.id), role_id: session.user.role_id }, orgId))) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true, documents: { select: { label: true, file_name: true, file_path: true, doc_number: true }, orderBy: { label: "asc" } } },
  });
  if (!org) return NextResponse.json({ error: "Company not found" }, { status: 404 });
  if (org.documents.length === 0) return NextResponse.json({ error: "This company has no documents" }, { status: 404 });

  const files: Zippable = {};
  const missing: string[] = [];
  await Promise.all(
    org.documents.map(async (doc) => {
      try {
        const data = await readDocumentFile(doc.file_path);
        const ext = path.extname(doc.file_name);
        let name = safeName(`${doc.label}${doc.doc_number ? ` - ${doc.doc_number}` : ""}`) + ext;
        for (let n = 2; files[name]; n++) name = safeName(`${doc.label} (${n})`) + ext;
        // Documents are mostly PDFs / images that are already compressed — store them as-is.
        files[name] = [new Uint8Array(data), { level: 0 }];
      } catch {
        missing.push(doc.label);
      }
    })
  );
  if (missing.length) files["MISSING FILES.txt"] = new TextEncoder().encode(`These files could not be found on the server:\n${missing.join("\n")}\n`);

  const zip = zipSync(files);
  const fileName = `${safeName(org.name)} documents.zip`;
  return new NextResponse(zip, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Length": String(zip.length),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
