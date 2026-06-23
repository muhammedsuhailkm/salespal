import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

// 1. Salesman dashboard statistics and lists
export const getCachedDashboardData = unstable_cache(
  async (userId: string) => {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [
      user,
      clients,
      thisMonthLogs,
      lastMonthLogs,
      tasks,
      onboardedByMonth,
    ] = await Promise.all([
      // Salesman info + org via their manager relationship
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          salesmanManager: {
            select: {
              manager: {
                select: {
                  managerOrgs: {
                    select: { org: { select: { name: true } } },
                    take: 1,
                  },
                },
              },
            },
            take: 1,
          },
        },
      }),

      // All assigned clients with status
      prisma.client.findMany({
        where: { assigned_salesman_id: userId },
        select: { status: true },
      }),

      // Client logs this month
      prisma.clientLog.findMany({
        where: {
          done_by: userId,
          created_at: { gte: thisMonthStart },
        },
        select: { action: true },
      }),

      // Client logs last month
      prisma.clientLog.findMany({
        where: {
          done_by: userId,
          created_at: { gte: lastMonthStart, lte: lastMonthEnd },
        },
        select: { action: true },
      }),

      // Tasks assigned to this salesman
      prisma.task.findMany({
        where: { assigned_to_id: userId },
        include: { assignedTo: { select: { name: true } } },
        orderBy: { due_date: "asc" },
        take: 50,
      }),

      // Onboarded by month (last 6 months) for chart
      prisma.clientLog.groupBy({
        by: ["created_at"],
        where: {
          done_by: userId,
          action: { contains: "onboarded" },
          created_at: { gte: sixMonthsAgo },
        },
        _count: { id: true },
      }),
    ]);

    return {
      user,
      clients,
      thisMonthLogs,
      lastMonthLogs,
      tasks,
      onboardedByMonth,
    };
  },
  ["salesman-dashboard"],
  { revalidate: 30, tags: ["salesman-dashboard"] }
);

// 2. Salesman clients list
export const getCachedClientsData = unstable_cache(
  async (userId: string) => {
    return prisma.client.findMany({
      where: { assigned_salesman_id: userId },
      include: {
        organization: { select: { name: true } }
      },
      orderBy: { id: "desc" }
    });
  },
  ["salesman-clients"],
  { revalidate: 30, tags: ["salesman-clients"] }
);

// 3. Salesman tasks list
export const getCachedTasksData = unstable_cache(
  async (userId: string) => {
    const [myInProcessTasks, managerAssignedTasks] = await Promise.all([
      prisma.task.findMany({
        where: {
          created_by_id: userId,
        },
        include: {
          assignedTo: { select: { name: true } },
          createdBy: { select: { name: true } },
        },
        orderBy: { due_date: "asc" },
      }),
      prisma.task.findMany({
        where: {
          assigned_to_id: userId,
          created_by_id: { not: userId },
        },
        include: {
          assignedTo: { select: { name: true } },
          createdBy: { select: { name: true } },
        },
        orderBy: { due_date: "asc" },
      }),
    ]);
    return { myInProcessTasks, managerAssignedTasks };
  },
  ["salesman-tasks"],
  { revalidate: 30, tags: ["salesman-tasks"] }
);
