import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getOrdersPage } from "@/lib/orders-list";
import { orderScopeWhere } from "@/lib/scoping";

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Paginated like the UI: ?page=&status=&pay=&q=
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const { rows, total, page, pageSize, totals } = await getOrdersPage(await orderScopeWhere(token), params);
  return NextResponse.json({ orders: rows, total, page, pageSize, totals });
}

/** Orders are no longer created directly: confirming an enquiry creates its order (lib/enquiry-flow.ts). */
export async function POST() {
  return NextResponse.json({ error: "Orders are created by confirming an enquiry" }, { status: 405 });
}
