import { prisma } from "@/lib/prisma";
import { orderPaymentsInclude, serializeOrder } from "@/lib/order-serialize";
import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";
import type { OrderStatsScope } from "@/lib/scoping";
import { serializeCompanyDocument } from "@/lib/company-documents";

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

// 1b. { status: count } of the salesman's clients (KPI cards + KPI score), counted in SQL
export const getCachedClientStatusCounts = unstable_cache(
  async (userId: number): Promise<Record<string, number>> => {
    const rows = await prisma.client.groupBy({ by: ["status"], where: { assigned_salesman_id: userId }, _count: { _all: true } });
    return Object.fromEntries(rows.map((r) => [r.status, r._count._all]));
  },
  ["salesman-client-status-counts"],
  { revalidate: 30, tags: ["salesman-dashboard", "salesman-clients"] }
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

/* ═══════════════════════════════════════════════════════
   Salesman Clients List
   ═══════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════
   Salesman Tasks List
   ═══════════════════════════════════════════════════════ */

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

// A10. Organizations with managers and clients for companies page
export const getCachedAdminCompaniesPageOrgs = unstable_cache(
  async () => {
    const [orgs, statusRows] = await Promise.all([
      prisma.organization.findMany({
      orderBy: { name: "asc" },
      include: {
        managers: {
          include: {
            manager: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        accountants: {
          include: {
            accountant: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
        documents: {
          include: { uploadedBy: { select: { name: true } } },
          orderBy: [{ label: "asc" }, { id: "asc" }],
        },
      },
    }),
      prisma.client.groupBy({ by: ["org_id", "status"], _count: { _all: true } }),
    ]);
    // Per-company client status counts (instead of loading every client row).
    const clientCounts = new Map<number, Record<string, number>>();
    for (const r of statusRows) {
      const c = clientCounts.get(r.org_id) ?? {};
      c[r.status] = r._count._all;
      clientCounts.set(r.org_id, c);
    }

    // Serialize here: unstable_cache JSON-encodes its result, which would turn Dates into strings.
    return orgs.map(({ documents, created_at, ...org }) => {
      const counts = clientCounts.get(org.id) ?? {};
      return {
        ...org,
        clientStatusCounts: counts,
        clientTotal: Object.values(counts).reduce((a, b) => a + b, 0),
        documents: documents.map(serializeCompanyDocument),
      };
    });
  },
  ["admin-companies-page-orgs"],
  { revalidate: 300, tags: ["admin-companies", "admin-clients"] }
);

// A11. Managers list for companies page
export const getCachedAdminCompaniesPageManagers = unstable_cache(
  async () => {
    return prisma.user.findMany({
      where: { role_id: 2 },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role_id: true,
      },
    });
  },
  ["admin-companies-page-managers"],
  { revalidate: 300, tags: ["admin-companies"] }
);

// A11b. Accountants list for companies page
export const getCachedAdminCompaniesPageAccountants = unstable_cache(
  async () => {
    return prisma.user.findMany({
      where: { role_id: 4 },
      select: { id: true, name: true, email: true, phone: true, role_id: true },
      orderBy: { name: "asc" },
    });
  },
  ["admin-companies-page-accountants"],
  { revalidate: 300, tags: ["admin-companies"] }
);

// A12. Salesmen list for companies page
export const getCachedAdminCompaniesPageSalesmen = unstable_cache(
  async () => {
    return prisma.user.findMany({
      where: { role_id: 3 },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role_id: true,
      },
    });
  },
  ["admin-companies-page-salesmen"],
  { revalidate: 300, tags: ["admin-companies"] }
);

// A13. Manager salesman relations for companies page
export const getCachedAdminCompaniesPageRelations = unstable_cache(
  async () => {
    return prisma.managerSalesman.findMany({
      select: {
        manager_id: true,
        salesman_id: true,
      },
    });
  },
  ["admin-companies-page-relations"],
  { revalidate: 300, tags: ["admin-companies"] }
);

// A14. Client counts grouped by salesman and status for companies page
export const getCachedAdminCompaniesPageClientCounts = unstable_cache(
  async () => {
    return prisma.client.groupBy({
      by: ["assigned_salesman_id", "status"],
      _count: {
        id: true,
      },
    });
  },
  ["admin-companies-page-client-counts"],
  { revalidate: 300, tags: ["admin-companies"] }
);

// A16. Managers list for admin clients page
export const getCachedAdminManagersList = unstable_cache(
  async () => {
    return prisma.user.findMany({
      where: { role_id: 2 },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  },
  ["admin-managers-list"],
  { revalidate: 300, tags: ["admin-clients"] }
);

// A17. Manager-salesman relations for admin clients page
export const getCachedAdminRelationsList = unstable_cache(
  async () => {
    return prisma.managerSalesman.findMany({
      select: { manager_id: true, salesman_id: true },
    });
  },
  ["admin-relations-list"],
  { revalidate: 300, tags: ["admin-clients"] }
);

/* ═══════════════════════════════════════════════════════
   Manager Dashboard — cached queries
   Each query is independent so Suspense boundaries
   can stream them in parallel.
   ═══════════════════════════════════════════════════════ */

// M2. Manager's organization(s) via manager_org
export const getCachedManagerOrg = unstable_cache(
  async (managerId: number) => {
    const orgs = await prisma.managerOrg.findMany({
      where: { manager_id: managerId },
      select: { org: { select: { id: true, name: true } } },
    });
    return orgs.map((o) => o.org);
  },
  ["manager-org"],
  { revalidate: 300, tags: ["manager-dashboard"] }
);

// M5. Latest activity feed for manager's team
export const getCachedManagerActivityFeed = unstable_cache(
  async (salesmanIds: number[]) => {
    return prisma.clientLog.findMany({
      where: { done_by: { in: salesmanIds } },
      orderBy: { created_at: "desc" },
      take: 10,
      select: {
        id: true,
        action: true,
        created_at: true,
        author: { select: { id: true, name: true } },
        client: { select: { name: true } },
      },
    });
  },
  ["manager-activity-feed"],
  { revalidate: 15, tags: ["manager-dashboard"] }
);


/* ═══════════════════════════════════════════════════════
   Orders — cached queries
   ═══════════════════════════════════════════════════════ */

// O3. Single order detail
export const getOrderById = unstable_cache(
  async (orderId: number) => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        client: { select: { id: true, name: true, org_id: true } },
        createdBy: { select: { id: true, name: true } },
        ...orderPaymentsInclude,
      },
    });
    return order ? serializeOrder(order) : null;
  },
  ["order-detail"],
  { revalidate: 15, tags: ["salesman-orders", "manager-orders", "accountant-orders"] }
);

// O4. Monthly order stats (orderCount, totalAmount, totalCollected, totalPending), raw-SQL aggregated
export const getMonthlyOrderStats = unstable_cache(
  async (scope: OrderStatsScope) => {
    let whereClause: Prisma.Sql;
    if (scope.role_id === 1) {
      whereClause = Prisma.sql`TRUE`;
    } else if (scope.role_id === 2) {
      whereClause = scope.orgIds.length ? Prisma.sql`c.org_id IN (${Prisma.join(scope.orgIds)})` : Prisma.sql`FALSE`;
    } else if (scope.role_id === 3) {
      whereClause = Prisma.sql`o.created_by_id = ${scope.userId}`;
    } else {
      whereClause = Prisma.sql`FALSE`;
    }

    const rows = await prisma.$queryRaw<
      { month: Date; orderCount: number; totalAmount: number; totalCollected: number; totalPending: number }[]
    >(Prisma.sql`
      SELECT
        date_trunc('month', o.created_at) AS month,
        COUNT(*)::int AS "orderCount",
        COALESCE(SUM(o.amount), 0)::float8 AS "totalAmount",
        COALESCE(SUM(o.advance_amount + COALESCE(p.paid, 0)), 0)::float8 AS "totalCollected",
        COALESCE(SUM(o.amount - o.advance_amount - COALESCE(p.paid, 0)), 0)::float8 AS "totalPending"
      FROM orders o
      JOIN clients c ON c.id = o.client_id
      LEFT JOIN (
        SELECT order_id, SUM(amount) AS paid FROM order_payments GROUP BY order_id
      ) p ON p.order_id = o.id
      WHERE ${whereClause}
      GROUP BY month
      ORDER BY month ASC
    `);

    return rows.map((row) => ({
      month: row.month,
      orderCount: Number(row.orderCount),
      totalAmount: Number(row.totalAmount),
      totalCollected: Number(row.totalCollected),
      totalPending: Number(row.totalPending),
    }));
  },
  ["order-monthly-stats"],
  { revalidate: 60, tags: ["order-stats"] }
);

/* ═══════════════════════════════════════════════════════
   Shipping Rates — set by accountants, read by everyone
   ═══════════════════════════════════════════════════════ */

export const getShippingRates = unstable_cache(
  async () => {
    const rates = await prisma.shippingRate.findMany({
      include: { updatedBy: { select: { name: true } } },
      orderBy: [{ location: "asc" }, { port: "asc" }],
    });
    return rates.map((rate) => ({ ...rate, price: rate.price.toNumber() }));
  },
  ["shipping-rates"],
  { revalidate: 60, tags: ["shipping-rates"] }
);
