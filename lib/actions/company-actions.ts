"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import bcrypt from "bcryptjs";
import { getSalesPalSession } from "@/lib/auth";

async function verifyAdmin() {
  const session = await getSalesPalSession();
  if (!session || session.user.role_id !== 1) {
    throw new Error("Unauthorized");
  }
}

export async function assignManagerToOrg(managerId: number, orgId: number) {
  await verifyAdmin();

  await prisma.managerOrg.upsert({
    where: {
      manager_id_org_id: {
        manager_id: managerId,
        org_id: orgId,
      },
    },
    update: {},
    create: {
      manager_id: managerId,
      org_id: orgId,
    },
  });

  revalidateTag("admin-companies", { expire: 0 });
  revalidatePath("/dashboard/admin/companies");
  return { success: true };
}

export async function removeManagerFromOrg(managerId: number, orgId: number) {
  await verifyAdmin();

  await prisma.managerOrg.delete({
    where: {
      manager_id_org_id: {
        manager_id: managerId,
        org_id: orgId,
      },
    },
  });

  revalidateTag("admin-companies", { expire: 0 });
  revalidatePath("/dashboard/admin/companies");
  return { success: true };
}

export async function assignSalesmanToManager(salesmanId: number, managerId: number) {
  await verifyAdmin();

  await prisma.managerSalesman.upsert({
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
  return { success: true };
}

export async function unassignSalesmanFromManager(salesmanId: number, managerId: number) {
  await verifyAdmin();

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
  return { success: true };
}

export async function createUserAction(data: {
  name: string;
  email: string;
  phone?: string;
  roleId: number;
}) {
  await verifyAdmin();

  const defaultPasswordHash = bcrypt.hashSync("salespal123", 10);

  const newUser = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone || null,
      role_id: data.roleId,
      password: defaultPasswordHash,
    },
  });

  revalidateTag("admin-companies", { expire: 0 });
  revalidatePath("/dashboard/admin/companies");
  return { success: true, userId: newUser.id };
}
