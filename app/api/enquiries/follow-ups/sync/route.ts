import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getTokenUserId, isRole } from "@/lib/scoping";
import { ensureEnquiryFollowUpTasks } from "@/lib/enquiry-follow-ups";
import { sweepDormantClients } from "@/lib/client-status-flow";

/**
 * Called when a salesman / manager opens the app: raises follow-up tasks for their stale open enquiries,
 * and (at most hourly) moves onboarded clients with no enquiry in 60 days to "dormant".
 */
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRole(token, [2, 3])) return NextResponse.json({ created: 0 });

  const [created, dormant] = await Promise.all([ensureEnquiryFollowUpTasks(getTokenUserId(token)), sweepDormantClients().catch(() => 0)]);
  return NextResponse.json({ created: created + dormant });
}
