import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSalesPalSession } from "@/lib/auth";
import { revalidatePath, revalidateTag } from "next/cache";

export async function POST(req: Request) {
  const session = await getSalesPalSession();
  if (!session || session.user.role_id !== 1) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const managerId = Number(body.managerId);
    const salesmanId = Number(body.salesmanId);

    if (isNaN(managerId) || isNaN(salesmanId)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const row = await prisma.managerSalesman.upsert({
      where: {
        manager_id_salesman_id: {
          manager_id: managerId,
          salesman_id: salesmanId,
        },
      },
      update: {},
      create: {
        manager_id: managerId,
        salesman_id: salesmanId,
      },
    });

    revalidateTag("admin-companies", { expire: 0 });
    revalidatePath("/dashboard/admin/companies");
    return NextResponse.json({ success: true, data: row });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getSalesPalSession();
  if (!session || session.user.role_id !== 1) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    let managerId = Number(url.searchParams.get("managerId"));
    let salesmanId = Number(url.searchParams.get("salesmanId"));

    if (isNaN(managerId) || isNaN(salesmanId)) {
      try {
        const body = await req.json();
        managerId = Number(body.managerId);
        salesmanId = Number(body.salesmanId);
      } catch (e) {
        // body not present
      }
    }

    if (isNaN(managerId) || isNaN(salesmanId)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    await prisma.managerSalesman.delete({
      where: {
        manager_id_salesman_id: {
          manager_id: managerId,
          salesman_id: salesmanId,
        },
      },
    });

    revalidateTag("admin-companies", { expire: 0 });
    revalidatePath("/dashboard/admin/companies");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
