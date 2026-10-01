import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { canAccessSalesman, getTokenUserId, isRole } from "@/lib/scoping";
import { parseDateOnly, todayUtc } from "@/lib/salesman-targets";

/** Managers assign a target amount and period to a salesman on their team. */
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRole(token, 2)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const salesmanId = Number(body.salesman_id);
  const amount = Number(body.amount);
  const start = parseDateOnly(body.period_start);
  const end = parseDateOnly(body.period_end);

  if (!Number.isInteger(salesmanId)) return NextResponse.json({ error: "Invalid salesman" }, { status: 400 });
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Target amount must be greater than 0" }, { status: 400 });
  if (!start || !end) return NextResponse.json({ error: "Invalid period dates" }, { status: 400 });
  if (end < start) return NextResponse.json({ error: "Period end cannot be before the start" }, { status: 400 });
  if (end < todayUtc()) return NextResponse.json({ error: "Period has already ended" }, { status: 400 });
  if (!(await canAccessSalesman(token, salesmanId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const target = await prisma.$transaction(async (tx) => {
    // A new target replaces any open target whose period overlaps it; the old one stays in history.
    await tx.salesmanTarget.updateMany({
      where: { salesman_id: salesmanId, closed_at: null, period_start: { lte: end }, period_end: { gte: start } },
      data: { closed_at: new Date() },
    });
    return tx.salesmanTarget.create({
      data: { salesman_id: salesmanId, set_by_id: getTokenUserId(token), amount, period_start: start, period_end: end },
    });
  });

  revalidatePath("/dashboard/manager/team");
  revalidatePath("/dashboard/admin/salesmen");
  return NextResponse.json({ target: { ...target, amount: target.amount.toNumber() } }, { status: 201 });
}
