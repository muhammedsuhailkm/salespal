"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { getSalesPalSession } from "@/lib/auth";
import { orderScopeWhere } from "@/lib/scoping";
import type { OrderApprovalStatus } from "@/types/order";

function revalidateOrders() {
  revalidateTag("salesman-orders", { expire: 0 });
  revalidateTag("manager-orders", { expire: 0 });
  revalidateTag("accountant-orders", { expire: 0 });
  revalidateTag("order-stats", { expire: 0 });
  revalidatePath("/dashboard/salesman/orders");
  revalidatePath("/dashboard/manager/orders");
  revalidatePath("/dashboard/accountant/orders");
}

async function getInScopeOrder(orderId: number) {
  const session = await getSalesPalSession();
  if (!session) throw new Error("Unauthorized");

  const order = await prisma.order.findFirst({
    where: { AND: [{ id: orderId }, await orderScopeWhere(session.user)] },
  });
  if (!order) throw new Error("Order not found or out of scope");

  return { session, order };
}

export async function setManagerApproval(orderId: number, decision: OrderApprovalStatus) {
  const { session, order } = await getInScopeOrder(orderId);
  if (session.user.role_id !== 2) {
    return { success: false, error: "Only managers can set manager approval." };
  }
  if (decision !== "approved" && decision !== "rejected") {
    return { success: false, error: "Invalid decision." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { manager_approval: decision },
      });
    });

    revalidateOrders();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update manager approval." };
  }
}

export async function setAccountsApproval(orderId: number, decision: OrderApprovalStatus) {
  const { session, order } = await getInScopeOrder(orderId);
  if (session.user.role_id !== 1 && session.user.role_id !== 4) {
    return { success: false, error: "Only accountants or admins can set accounts approval." };
  }
  if (decision !== "approved" && decision !== "rejected") {
    return { success: false, error: "Invalid decision." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { accounts_approval: decision },
      });
    });

    revalidateOrders();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update accounts approval." };
  }
}

export async function setOrderStatus(orderId: number, status: "cancelled" | "completed") {
  const { order } = await getInScopeOrder(orderId);

  if (status === "completed") {
    if (order.status !== "draft") {
      return { success: false, error: "Only draft orders can be completed." };
    }
    if (order.manager_approval !== "approved" || order.accounts_approval !== "approved") {
      return { success: false, error: "Both manager and accounts approval are required before an order can be completed." };
    }
  } else if (status === "cancelled") {
    // Cancellation is allowed at any time, regardless of current status or approval state.
    if (order.status === "cancelled") {
      return { success: false, error: "Order is already cancelled." };
    }
  } else {
    return { success: false, error: "Invalid status." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status },
      });
    });

    revalidateOrders();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update order status." };
  }
}
