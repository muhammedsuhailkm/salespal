import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { getTokenUserId, isRole } from "@/lib/scoping";
import { enquiryScopeWhere, revalidateEnquiryPages } from "@/lib/enquiries";
import { closeFollowUpTasks, revalidateTaskViews } from "@/lib/enquiry-follow-ups";

/** Salesman / manager cancels an open enquiry. A reason is mandatory. */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRole(token, [2, 3])) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await context.params;
  const body = await request.json();
  const reason = String(body.reason ?? "").trim();
  if (reason.length < 5) return NextResponse.json({ error: "Give a reason for cancelling (at least 5 characters)" }, { status: 400 });
  if (reason.length > 1000) return NextResponse.json({ error: "Reason is too long (max 1000 characters)" }, { status: 400 });

  const enquiry = await prisma.enquiry.findFirst({
    where: { AND: [{ id: Number(id) }, await enquiryScopeWhere(token)] },
    include: { order: { select: { id: true } } },
  });
  if (!enquiry) return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
  if (enquiry.status !== "open" || enquiry.order) {
    return NextResponse.json({ error: "Only open enquiries can be cancelled" }, { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    // Conditional update guards against a concurrent conversion to an order.
    const res = await tx.enquiry.updateMany({
      where: { id: enquiry.id, status: "open", order: null },
      data: { status: "cancelled", cancel_reason: reason, cancelled_at: new Date(), cancelled_by_id: getTokenUserId(token) },
    });
    if (res.count !== 1) throw new Error("Enquiry is no longer open");
    await closeFollowUpTasks(tx, enquiry.id, "unsuccessful");
  });

  revalidateEnquiryPages();
  revalidateTaskViews();
  revalidateTag("accountant-orders", { expire: 0 });
  return NextResponse.json({ ok: true });
}
