"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import bcrypt from "bcryptjs";
import { getSalesPalSession } from "@/lib/auth";

async function verifyManager() {
  const session = await getSalesPalSession();
  if (!session || (session.user.role_id !== 2 && session.user.role_id !== 1)) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

export async function createSalesmanAction(data: {
  name: string;
  email: string;
  phone?: string;
}) {
  const managerId = await verifyManager();

  const defaultPasswordHash = bcrypt.hashSync("salespal123", 10);

  // Check duplicate email
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase() },
  });
  if (existingUser) {
    return { success: false, error: "A user with this email address already exists." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the salesman user
      const newUser = await tx.user.create({
        data: {
          name: data.name,
          email: data.email.toLowerCase(),
          phone: data.phone || null,
          role_id: 3, // Salesman
          password: defaultPasswordHash,
        },
      });

      // 2. Link salesman to the logged-in manager
      await tx.managerSalesman.create({
        data: {
          manager_id: managerId,
          salesman_id: newUser.id,
        },
      });

      return newUser;
    });

    revalidateTag("manager-dashboard", { expire: 0 });
    revalidatePath("/dashboard/manager/team");
    return { success: true, userId: result.id };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create salesman." };
  }
}

export async function removeSalesmanAction(salesmanId: number) {
  const managerId = await verifyManager();

  try {
    await prisma.managerSalesman.delete({
      where: {
        manager_id_salesman_id: {
          manager_id: managerId,
          salesman_id: salesmanId,
        },
      },
    });

    revalidateTag("manager-dashboard", { expire: 0 });
    revalidatePath("/dashboard/manager/team");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to remove salesman." };
  }
}
