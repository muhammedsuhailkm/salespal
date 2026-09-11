import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { clientScopeWhere } from "@/lib/scoping";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const body = await request.json();
  const scoped = await prisma.client.findFirst({ where: { AND: [{ id: Number(id) }, await clientScopeWhere(token)] } });
  if (!scoped) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const client = await prisma.$transaction(async (tx) => {
      const updatedClient = await tx.client.update({
        where: { id: Number(id) },
        data: { status: body.status },
      });

      await tx.clientLog.create({
        data: {
          client_id: updatedClient.id,
          action: `Status changed to ${body.status}`,
          done_by: Number(token.id),
        },
      });

      await tx.salesmanKpiLog.create({
        data: {
          salesman_id: updatedClient.assigned_salesman_id,
          action: body.status,
        },
      });

      return updatedClient;
    });

    revalidateTag("salesman-dashboard", { expire: 0 });
    revalidateTag("salesman-clients", { expire: 0 });
    revalidateTag("admin-clients", { expire: 0 });
    revalidateTag("manager-dashboard", { expire: 0 });
    revalidateTag("manager-clients", { expire: 0 });
    return NextResponse.json({ client });
  } catch (error) {
    console.error("Status update transaction error:", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
