"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import bcrypt from "bcryptjs";
import { getSalesPalSession } from "@/lib/auth";
import { getManagerOrgIds } from "@/lib/scoping";
import { revalidateTeamViews, setSalesmanCompanies, TeamAssignmentError } from "@/lib/team-assignments";

async function verifyManager() {
  const session = await getSalesPalSession();
  if (!session || (session.user.role_id !== 2 && session.user.role_id !== 1)) {
    throw new Error("Unauthorized");
  }
  return Number(session.user.id);
}

export async function createSalesmanAction(data: {
  name: string;
  email: string;
  phone?: string;
  /** Companies (of the manager's) the salesman works for. Defaults to the manager's only company. */
  orgIds?: number[];
}) {
  const managerId = await verifyManager();
  const managerOrgs = await getManagerOrgIds(managerId);
  const orgIds = data.orgIds?.length ? data.orgIds : managerOrgs.length === 1 ? managerOrgs : [];
  if (orgIds.length === 0) return { success: false, error: "Pick at least one company for the salesman." };

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

      // 2. Put them on the logged-in manager's team for the chosen companies
      await setSalesmanCompanies(managerId, newUser.id, orgIds, tx);

      return newUser;
    });

    revalidateTag("manager-dashboard", { expire: 0 });
    revalidateTag("manager-team", { expire: 0 });
    revalidateTag("manager-tasks", { expire: 0 });
    revalidateTag("manager-clients", { expire: 0 });
    revalidatePath("/dashboard/manager/team");
    revalidateTeamViews();
    return { success: true, userId: result.id };
  } catch (error: any) {
    if (error instanceof TeamAssignmentError) return { success: false, error: error.message };
    return { success: false, error: error.message || "Failed to create salesman." };
  }
}

/** Takes the salesman off the manager's team for every company. */
export async function removeSalesmanAction(salesmanId: number) {
  const managerId = await verifyManager();

  try {
    await prisma.managerSalesman.deleteMany({ where: { manager_id: managerId, salesman_id: salesmanId } });
    revalidateTeamViews();
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to remove salesman." };
  }
}

/** Sets which of the manager's companies a salesman on their team works for. */
export async function setSalesmanCompaniesAction(salesmanId: number, orgIds: number[]) {
  const managerId = await verifyManager();
  const onTeam = await prisma.managerSalesman.findFirst({ where: { manager_id: managerId, salesman_id: salesmanId }, select: { org_id: true } });
  if (!onTeam) return { success: false, error: "That salesman isn't on your team." };

  try {
    await setSalesmanCompanies(managerId, salesmanId, orgIds);
    revalidateTeamViews();
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update companies." };
  }
}
