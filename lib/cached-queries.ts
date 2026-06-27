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


/* ═══════════════════════════════════════════════════════
   Admin / Owner Dashboard — cached queries
   Each query is independent so Suspense boundaries
   can stream them in parallel.
   ═══════════════════════════════════════════════════════ */

// A1. Organizations (rarely changes)
export const getCachedAdminOrgs = unstable_cache(
  async () => {
    return prisma.organization.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  },
  ["admin-orgs"],
  { revalidate: 300, tags: ["admin-dashboard"] }
);

// A2. All clients with status + org + salesman (core data)
export const getCachedAdminClients = unstable_cache(
  async (orgId?: number) => {
    const where = orgId ? { org_id: orgId } : {};
    return prisma.client.findMany({
      where,
      select: {
        id: true,
        name: true,
        status: true,
        org_id: true,
        assigned_salesman_id: true,
        created_at: true,
        organization: { select: { name: true } },
        assignedSalesman: { select: { id: true, name: true } },
      },
    });
  },
  ["admin-clients"],
  { revalidate: 30, tags: ["admin-dashboard"] }
);

// A3. Client logs filtered by action keyword + date range
export const getCachedAdminLogsByAction = unstable_cache(
  async (actionContains: string, sinceIso: string, untilIso?: string) => {
    const dateFilter: Record<string, Date> = { gte: new Date(sinceIso) };
    if (untilIso) dateFilter.lte = new Date(untilIso);
    return prisma.clientLog.findMany({
      where: {
        action: { contains: actionContains },
        created_at: dateFilter,
      },
      select: {
        id: true,
        action: true,
        done_by: true,
        client_id: true,
        created_at: true,
        client: { select: { name: true, org_id: true, status: true, organization: { select: { name: true } } } },
        author: { select: { id: true, name: true } },
      },
    });
  },
  ["admin-logs-by-action"],
  { revalidate: 30, tags: ["admin-dashboard"] }
);

// A4. Count of logs by action keyword + date range
export const getCachedAdminLogCount = unstable_cache(
  async (actionContains: string, sinceIso: string, untilIso?: string) => {
    const dateFilter: Record<string, Date> = { gte: new Date(sinceIso) };
    if (untilIso) dateFilter.lte = new Date(untilIso);
    return prisma.clientLog.count({
      where: {
        action: { contains: actionContains },
        created_at: dateFilter,
      },
    });
  },
  ["admin-log-count"],
  { revalidate: 30, tags: ["admin-dashboard"] }
);

// A5. All tasks with status
export const getCachedAdminTasks = unstable_cache(
  async () => {
    return prisma.task.findMany({
      select: { id: true, status: true, description: true, due_date: true, assigned_to_id: true },
    });
  },
  ["admin-tasks"],
  { revalidate: 30, tags: ["admin-dashboard"] }
);

// A6. Salesmen with assigned clients + manager info
export const getCachedAdminSalesmen = unstable_cache(
  async () => {
    return prisma.user.findMany({
      where: { role_id: 3 },
      select: {
        id: true,
        name: true,
        assignedClients: { select: { status: true, org_id: true } },
        salesmanManager: {
          select: {
            manager: {
              select: {
                name: true,
                managerOrgs: { select: { org: { select: { name: true } } } },
              },
            },
          },
          take: 1,
        },
      },
    });
  },
  ["admin-salesmen"],
  { revalidate: 60, tags: ["admin-dashboard"] }
);

// A7. Latest activity feed (client_logs + user/client names)
export const getCachedAdminActivityFeed = unstable_cache(
  async () => {
    return prisma.clientLog.findMany({
      orderBy: { created_at: "desc" },
      take: 10,
      select: {
        id: true,
        action: true,
        created_at: true,
        author: { select: { name: true } },
        client: { select: { name: true } },
      },
    });
  },
  ["admin-activity-feed"],
  { revalidate: 15, tags: ["admin-dashboard"] }
);

// A8. Managers with their org assignments
export const getCachedAdminManagers = unstable_cache(
  async () => {
    return prisma.user.findMany({
      where: { role_id: 2 },
      select: {
        id: true,
        name: true,
        managerOrgs: {
          select: { org: { select: { id: true, name: true } } },
        },
        managerSalesmen: {
          select: {
            salesman: {
              select: {
                id: true,
                name: true,
                assignedClients: { select: { status: true } },
              },
            },
          },
        },
      },
    });
  },
  ["admin-managers"],
  { revalidate: 300, tags: ["admin-dashboard"] }
);

// A9. Onboarded logs for trend chart (last 6 months, grouped by month + org)
export const getCachedAdminTrendData = unstable_cache(
  async (sinceIso: string) => {
    return prisma.clientLog.findMany({
      where: {
        action: { contains: "onboarded" },
        created_at: { gte: new Date(sinceIso) },
      },
      select: {
        created_at: true,
        client: { select: { org_id: true } },
      },
    });
  },
  ["admin-trend-data"],
  { revalidate: 300, tags: ["admin-dashboard"] }
);
