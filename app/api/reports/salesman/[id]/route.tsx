import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSalesPalSession } from "@/lib/auth";
import { canAccessSalesman } from "@/lib/scoping";
import { prisma } from "@/lib/prisma";
import { currentMonthKey, getSalesmanMonthlyReport, parseMonth } from "@/lib/salesman-report";
import { SalesmanReportPdf } from "@/components/reports/SalesmanReportPdf";

export const runtime = "nodejs";

/** Monthly performance PDF for one salesman: GET ?month=YYYY-MM (defaults to the current month). Managers (own team) and admins. */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSalesPalSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role_id !== 1 && session.user.role_id !== 2) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const salesmanId = Number((await context.params).id);
  const month = new URL(request.url).searchParams.get("month") ?? currentMonthKey();
  if (!parseMonth(month)) return NextResponse.json({ error: "Month must be YYYY-MM" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: salesmanId }, select: { role_id: true } });
  if (!user || user.role_id !== 3 || !(await canAccessSalesman({ id: session.user.id, role_id: session.user.role_id }, salesmanId))) {
    return NextResponse.json({ error: "Salesman not found" }, { status: 404 });
  }

  const report = await getSalesmanMonthlyReport(salesmanId, month);
  if (!report) return NextResponse.json({ error: "Salesman not found" }, { status: 404 });

  const pdf = await renderToBuffer(<SalesmanReportPdf report={report} />);
  const fileName = `${report.salesman.name} - ${report.monthLabel} performance.pdf`.replace(/[\\/:*?"<>|]+/g, "-");
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(pdf.length),
      "Content-Disposition": `${new URL(request.url).searchParams.get("download") ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
