import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

/* ═══════════════════════════════════════════════════════
   Salesman Dashboard — split into independent cached queries
   so each <Suspense> boundary can stream independently.
   ═══════════════════════════════════════════════════════ */

// 1a. Salesman info + org name
export const getCachedSalesmanInfo = unstable_cache(
  async (userId: number) => {
    return prisma.user.findUnique({
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
    });
  },
  ["salesman-info"],
  { revalidate: 60, tags: ["salesman-dashboard"] }
);

// 1b. All assigned clients with status (used for KPI cards + KPI score)
export const getCachedClientStatuses = unstable_cache(
  async (userId: number) => {
    return prisma.client.findMany({
      where: { assigned_salesman_id: userId },
      select: { status: true },
    });
  },
  ["salesman-client-statuses"],
  { revalidate: 30, tags: ["salesman-dashboard"] }
);

// 1c. Client logs for a given date range (this month / last month)
export const getCachedMonthLogs = unstable_cache(
  async (userId: number, gteIso: string, lteIso?: string) => {
    const where: any = {
      done_by: userId,
      created_at: { gte: new Date(gteIso) },
    };
    if (lteIso) {
      where.created_at.lte = new Date(lteIso);
    }
    return prisma.clientLog.findMany({
      where,
      select: { action: true },
    });
  },
  ["salesman-month-logs"],
  { revalidate: 30, tags: ["salesman-dashboard"] }
);

// 1d. Tasks assigned to this salesman
export const getCachedSalesmanTasks = unstable_cache(
  async (userId: number) => {
    return prisma.task.findMany({
      where: { assigned_to_id: userId },
      include: { assignedTo: { select: { name: true } } },
      orderBy: { due_date: "asc" },
      take: 50,
    });
  },
  ["salesman-tasks-dash"],
  { revalidate: 30, tags: ["salesman-dashboard"] }
);

// 1e. Onboarded by month (last 6 months) for chart
export const getCachedOnboardedByMonth = unstable_cache(
  async (userId: number, sinceIso: string) => {
    return prisma.clientLog.groupBy({
      by: ["created_at"],
      where: {
        done_by: userId,
        action: { contains: "onboarded" },
        created_at: { gte: new Date(sinceIso) },
      },
      _count: { id: true },
    });
  },
  ["salesman-onboarded-chart"],
  { revalidate: 60, tags: ["salesman-dashboard"] }
);

/* ─── Legacy wrapper — keeps back-compat if anything still imports it ─── */
export async function getCachedDashboardData(userId: number) {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [user, clients, thisMonthLogs, lastMonthLogs, tasks, onboardedByMonth] =
    await Promise.all([
      getCachedSalesmanInfo(userId),
      getCachedClientStatuses(userId),
      getCachedMonthLogs(userId, thisMonthStart.toISOString()),
      getCachedMonthLogs(userId, lastMonthStart.toISOString(), lastMonthEnd.toISOString()),
      getCachedSalesmanTasks(userId),
      getCachedOnboardedByMonth(userId, sixMonthsAgo.toISOString()),
    ]);

  return { user, clients, thisMonthLogs, lastMonthLogs, tasks, onboardedByMonth };
}


/* ═══════════════════════════════════════════════════════
   Salesman Clients List
   ═══════════════════════════════════════════════════════ */

export const getCachedClientsData = unstable_cache(
  async (userId: number) => {
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


/* ═══════════════════════════════════════════════════════
   Salesman Tasks List
   ═══════════════════════════════════════════════════════ */

export const getCachedTasksData = unstable_cache(
  async (userId: number) => {
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


/* ═══════════════════════════════════════════════════════
   Client Detail (for server-component client overview page)
   ═══════════════════════════════════════════════════════ */

export const getCachedClientDetail = unstable_cache(
  async (clientId: number, userId: number) => {
    const [client, tasks] = await Promise.all([
      prisma.client.findFirst({
        where: { id: clientId, assigned_salesman_id: userId },
        include: {
          logs: {
            include: { author: { select: { name: true } } },
            orderBy: { created_at: "desc" },
            take: 50,
          },
          organization: true,
          assignedSalesman: { select: { name: true } },
        },
      }),
      prisma.clientTask.findMany({
        where: { client_id: clientId },
        include: {
          assignedTo: { select: { name: true } },
          createdBy: { select: { name: true } },
        },
        orderBy: { due_date: "asc" },
      }),
    ]);
    return { client, tasks };
  },
  ["client-detail"],
  { revalidate: 15, tags: ["salesman-clients"] }
);
