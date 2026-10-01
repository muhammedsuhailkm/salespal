"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import bcrypt from "bcryptjs";
import { getSalesPalSession } from "@/lib/auth";
import { removeDocumentFile } from "@/lib/company-documents";

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

/** Accountant role (id 4) — owner/admin-only, no org or manager assignment. */
export async function createAccountantAction(data: {
  name: string;
  email: string;
  phone?: string;
}) {
  await verifyAdmin();

  const email = data.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return { success: false, error: "A user with this email address already exists." };
  }

  const defaultPasswordHash = bcrypt.hashSync("salespal123", 10);

  try {
    const newUser = await prisma.user.create({
      data: {
        name: data.name,
        email,
        phone: data.phone || null,
        role_id: 4,
        password: defaultPasswordHash,
      },
    });

    revalidatePath("/dashboard/admin/users");
    revalidateTag("admin-companies", { expire: 0 });
    return { success: true, userId: newUser.id };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create accountant." };
  }
}

function revalidateCompanies() {
  revalidateTag("admin-companies", { expire: 0 });
  revalidateTag("admin-dashboard", { expire: 0 });
  revalidatePath("/dashboard/admin/companies");
}

export type CompanyInput = {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
};

function cleanCompanyInput(data: CompanyInput) {
  return {
    name: data.name.trim(),
    address: data.address?.trim() || null,
    phone: data.phone?.trim() || null,
    email: data.email?.trim().toLowerCase() || null,
  };
}

export async function createCompanyAction(data: CompanyInput) {
  await verifyAdmin();
  const input = cleanCompanyInput(data);
  if (!input.name) return { success: false, error: "Company name is required." };

  const existing = await prisma.organization.findUnique({ where: { name: input.name } });
  if (existing) return { success: false, error: "A company with this name already exists." };

  const org = await prisma.organization.create({ data: input });
  revalidateCompanies();
  return { success: true, orgId: org.id };
}

export async function updateCompanyAction(orgId: number, data: CompanyInput) {
  await verifyAdmin();
  const input = cleanCompanyInput(data);
  if (!input.name) return { success: false, error: "Company name is required." };

  const clash = await prisma.organization.findFirst({ where: { name: input.name, id: { not: orgId } } });
  if (clash) return { success: false, error: "A company with this name already exists." };

  await prisma.organization.update({ where: { id: orgId }, data: input });
  revalidateCompanies();
  return { success: true };
}

/** Only empty companies can be deleted — clients (and their enquiries / orders) are never removed with it. */
export async function deleteCompanyAction(orgId: number) {
  await verifyAdmin();

  const clientCount = await prisma.client.count({ where: { org_id: orgId } });
  if (clientCount > 0) {
    return {
      success: false,
      error: `This company still has ${clientCount} client${clientCount === 1 ? "" : "s"}. Move or remove them before deleting the company.`,
    };
  }

  const documents = await prisma.companyDocument.findMany({ where: { org_id: orgId }, select: { file_path: true } });
  await prisma.organization.delete({ where: { id: orgId } });
  await Promise.all(documents.map((d) => removeDocumentFile(d.file_path)));

  revalidateCompanies();
  return { success: true };
}

export async function assignAccountantToOrg(accountantId: number, orgId: number) {
  await verifyAdmin();

  const accountant = await prisma.user.findFirst({ where: { id: accountantId, role_id: 4 }, select: { id: true } });
  if (!accountant) return { success: false, error: "Accountant not found." };

  await prisma.accountantOrg.upsert({
    where: { accountant_id_org_id: { accountant_id: accountantId, org_id: orgId } },
    update: {},
    create: { accountant_id: accountantId, org_id: orgId },
  });

  revalidateCompanies();
  revalidateTag("accountant-orders", { expire: 0 });
  return { success: true };
}

export async function removeAccountantFromOrg(accountantId: number, orgId: number) {
  await verifyAdmin();

  await prisma.accountantOrg.deleteMany({ where: { accountant_id: accountantId, org_id: orgId } });

  revalidateCompanies();
  revalidateTag("accountant-orders", { expire: 0 });
  return { success: true };
}
