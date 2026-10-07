import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { getTokenUserId, isRole } from "@/lib/scoping";
import { enquiryScopeWhere, revalidateEnquiryPages } from "@/lib/enquiries";
import { isActiveEnquiry } from "@/types/enquiry";
import { closeFollowUpTasks, nextFollowUpDate, revalidateTaskViews } from "@/lib/enquiry-follow-ups";

/**
 * Salesman / manager logs a follow-up comment on an open enquiry. This completes any outstanding
 * follow-up task for it and pushes the next automatic follow-up out by another 30 days.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRole(token, [2, 3])) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await context.params;
  const body = await request.json();
  const comment = String(body.comment ?? "").trim();
  if (!comment) return NextResponse.json({ error: "Write a follow-up comment" }, { status: 400 });
  if (comment.length > 2000) return NextResponse.json({ error: "Comment is too long (max 2000 characters)" }, { status: 400 });

  const enquiry = await prisma.enquiry.findFirst({
    where: { AND: [{ id: Number(id) }, await enquiryScopeWhere(token)] },
  });
  if (!enquiry) return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
  if (!isActiveEnquiry(enquiry.status)) {
    return NextResponse.json({ error: "Follow-ups can only be added to enquiries that are still in progress" }, { status: 409 });
  }

  const followUp = await prisma.$transaction(async (tx) => {
    const created = await tx.enquiryFollowUp.create({
      data: { enquiry_id: enquiry.id, comment, created_by_id: getTokenUserId(token) },
    });
    await tx.enquiry.update({ where: { id: enquiry.id }, data: { next_follow_up_at: nextFollowUpDate() } });
    await closeFollowUpTasks(tx, enquiry.id, "achieved");
    return created;
  });

  revalidateEnquiryPages();
  revalidateTaskViews();
  return NextResponse.json({ follow_up: { id: followUp.id } }, { status: 201 });
}
