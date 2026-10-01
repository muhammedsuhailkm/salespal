import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getTokenUserId, isRole } from "@/lib/scoping";
import { ensureEnquiryFollowUpTasks } from "@/lib/enquiry-follow-ups";

/** Called when a salesman / manager opens the app: raises follow-up tasks for their stale open enquiries. */
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRole(token, [2, 3])) return NextResponse.json({ created: 0 });

  const created = await ensureEnquiryFollowUpTasks(getTokenUserId(token));
  return NextResponse.json({ created });
}
