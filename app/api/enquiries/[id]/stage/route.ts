import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { getTokenUserId } from "@/lib/scoping";
import { enquiryScopeWhere } from "@/lib/enquiries";
import { FlowError, applyEnquiryAction, type EnquiryAction } from "@/lib/enquiry-flow";

const ACTIONS: EnquiryAction[] = ["quote", "negotiate", "revise", "confirm", "lose"];

/** Move an enquiry to its next stage: { action, cost?, profit?, reason? } (see lib/enquiry-flow.ts). */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  if (!ACTIONS.includes(body.action)) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  const scoped = await prisma.enquiry.findFirst({ where: { AND: [{ id: Number(id) }, await enquiryScopeWhere(token)] }, select: { id: true } });
  if (!scoped) return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });

  try {
    const result = await applyEnquiryAction(scoped.id, body.action, body, { id: getTokenUserId(token), role_id: Number(token.role_id) });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof FlowError) return NextResponse.json({ error: error.message, ...error.extra }, { status: error.status });
    throw error;
  }
}
