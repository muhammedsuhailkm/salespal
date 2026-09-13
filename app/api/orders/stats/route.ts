import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getMonthlyOrderStats } from "@/lib/cached-queries";
import { orderStatsScope } from "@/lib/scoping";

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scope = await orderStatsScope(token);
  const stats = await getMonthlyOrderStats(scope);
  return NextResponse.json({ stats });
}
