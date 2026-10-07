import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { getTokenUserId } from "@/lib/scoping";
import { enquiryScopeWhere } from "@/lib/enquiries";
import { FlowError, applyEnquiryAction } from "@/lib/enquiry-flow";

/** Salesman / manager marks an active enquiry as lost. A reason is mandatory. */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const reason = String(body.reason ?? "").trim();
  if (reason.length < 5) return NextResponse.json({ error: "Give a reason (at least 5 characters)" }, { status: 400 });
  if (reason.length > 1000) return NextResponse.json({ error: "Reason is too long (max 1000 characters)" }, { status: 400 });

  const enquiry = await prisma.enquiry.findFirst({ where: { AND: [{ id: Number(id) }, await enquiryScopeWhere(token)] }, select: { id: true } });
  if (!enquiry) return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });

  try {
    await applyEnquiryAction(enquiry.id, "lose", { reason }, { id: getTokenUserId(token), role_id: Number(token.role_id) });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof FlowError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
