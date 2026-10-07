import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { intParam, pageParam, param, PAGE_SIZE, type Paged, type SearchParams } from "@/lib/list-params";
import type { TaskKind } from "@/types/task";

/** General tasks and client tasks, merged into one list (same shape the task lists already use). */
export type UnifiedTaskRow = {
  id: number;
  description: string;
  due_date: string;
  status: string;
  isClientTask: boolean;
  clientId: number | null;
  clientName: string | null;
  created_by_id: number;
  assignedTo: { name: string };
  createdBy: { name: string };
  enquiry: { id: number; status: string } | null;
  kind: TaskKind;
};

type Scope =
  /** Manager view: tasks assigned to these salesmen. */
  | { assignedTo: number[] }
  /** Salesman view: tasks they created or that were assigned to them. */
  | { userId: number };

function scopeSql(scope: Scope, alias: string) {
  if ("userId" in scope) return Prisma.sql`(${Prisma.raw(alias)}.created_by_id = ${scope.userId} OR ${Prisma.raw(alias)}.assigned_to_id = ${scope.userId})`;
  if (scope.assignedTo.length === 0) return Prisma.sql`FALSE`;
  return Prisma.sql`${Prisma.raw(alias)}.assigned_to_id IN (${Prisma.join(scope.assignedTo)})`;
}

function unionSql(scope: Scope) {
  return Prisma.sql`
    SELECT t.id, t.description, t.due_date, t.status, false AS is_client_task, NULL::int AS client_id, NULL::text AS client_name,
           t.assigned_to_id, t.created_by_id, a.name AS assigned_name, cb.name AS created_name, t.enquiry_id, e.status AS enquiry_status,
           CASE WHEN t.enquiry_id IS NOT NULL THEN 'enquiry_follow_up'
                -- Accountant payment reminders created before tasks had a category
                WHEN t.category = 'payment_follow_up' OR t.description LIKE 'Payment reminder:%' THEN 'payment_follow_up'
                WHEN t.category = 'order_follow_up' THEN 'order_follow_up'
                ELSE 'general' END AS kind
    FROM tasks t
    JOIN users a ON a.id = t.assigned_to_id
    JOIN users cb ON cb.id = t.created_by_id
    LEFT JOIN enquiries e ON e.id = t.enquiry_id
    WHERE ${scopeSql(scope, "t")}
    UNION ALL
    SELECT ct.id, ct.description, ct.due_date, ct.status, true, ct.client_id, cl.name,
           ct.assigned_to_id, ct.created_by_id, a.name, cb.name, NULL::int, NULL::text, 'general'
    FROM client_tasks ct
    JOIN users a ON a.id = ct.assigned_to_id
    JOIN users cb ON cb.id = ct.created_by_id
    JOIN clients cl ON cl.id = ct.client_id
    WHERE ${scopeSql(scope, "ct")}`;
}

const OPEN = Prisma.sql`x.status IN ('pending', 'in_process')`;
const CLOSED = Prisma.sql`x.status IN ('achieved', 'unsuccessful')`;

/** Salesman task tabs. Follow-up tabs and "mine" list open work; "completed" lists closed tasks. */
export const taskViews = ["all", "mine", "enquiry", "order", "payment", "completed"] as const;
export type TaskView = (typeof taskViews)[number];

function viewSql(view: TaskView, userId: number) {
  switch (view) {
    case "mine":
      // Tasks the salesman wrote themselves (not system enquiry follow-ups or reminders from others)
      return Prisma.sql`x.created_by_id = ${userId} AND x.kind <> 'enquiry_follow_up' AND ${OPEN}`;
    case "enquiry":
      return Prisma.sql`x.kind = 'enquiry_follow_up' AND ${OPEN}`;
    case "order":
      return Prisma.sql`x.kind = 'order_follow_up' AND ${OPEN}`;
    case "payment":
      return Prisma.sql`x.kind = 'payment_follow_up' AND ${OPEN}`;
    case "completed":
      return CLOSED;
    default:
      return null;
  }
}

/** Filters: type (general | client), status, salesman (assignee id), q (description / salesman / client). */
function filterParts(params: SearchParams) {
  const parts: Prisma.Sql[] = [];
  const type = param(params, "type");
  if (type === "general") parts.push(Prisma.sql`NOT x.is_client_task`);
  if (type === "client") parts.push(Prisma.sql`x.is_client_task`);
  const status = param(params, "status");
  if (status) parts.push(Prisma.sql`x.status = ${status}`);
  const salesman = intParam(params, "salesman");
  if (salesman) parts.push(Prisma.sql`x.assigned_to_id = ${salesman}`);
  const q = param(params, "q");
  if (q) {
    const like = `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
    parts.push(Prisma.sql`(x.description ILIKE ${like} OR x.assigned_name ILIKE ${like} OR x.client_name ILIKE ${like} OR x.created_name ILIKE ${like})`);
  }
  return parts;
}

const whereSql = (parts: Prisma.Sql[]) => (parts.length ? Prisma.sql`WHERE ${Prisma.join(parts, " AND ")}` : Prisma.empty);

type RawRow = {
  id: number;
  description: string;
  due_date: Date;
  status: string;
  is_client_task: boolean;
  client_id: number | null;
  client_name: string | null;
  assigned_to_id: number;
  created_by_id: number;
  assigned_name: string;
  created_name: string;
  enquiry_id: number | null;
  enquiry_status: string | null;
  kind: TaskKind;
};

export type TasksPage = Paged<UnifiedTaskRow> & {
  /** Salesman view only: totals for "created by you" / "assigned by managers". */
  createdByMe: number;
  assignedToMe: number;
  /** Per-tab totals (search and type filters applied, tab filter not). */
  viewCounts: Record<TaskView, number>;
};

/** One page of tasks, pending first, then by due date — sorted and paged in SQL across both task tables. */
export async function getTasksPage(scope: Scope, params: SearchParams): Promise<TasksPage> {
  const page = pageParam(params);
  const union = unionSql(scope);
  const userId = "userId" in scope ? scope.userId : -1;
  const baseParts = filterParts(params);
  const viewParam = param(params, "view") as TaskView | undefined;
  const view: TaskView = viewParam && taskViews.includes(viewParam) ? viewParam : "all";
  const viewPart = viewSql(view, userId);
  const where = whereSql(viewPart ? [...baseParts, viewPart] : baseParts);
  const baseWhere = whereSql(baseParts);
  const countFor = (v: TaskView) => Prisma.sql`COUNT(*) FILTER (WHERE ${viewSql(v, userId) ?? Prisma.sql`TRUE`})::int`;

  const [rows, totals, views] = await Promise.all([
    prisma.$queryRaw<RawRow[]>(Prisma.sql`
      SELECT * FROM (${union}) x ${where}
      ORDER BY CASE x.status WHEN 'pending' THEN 0 WHEN 'in_process' THEN 1 WHEN 'achieved' THEN 2 WHEN 'unsuccessful' THEN 3 ELSE 99 END,
               x.due_date, x.is_client_task, x.id
      LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`),
    prisma.$queryRaw<{ total: number; mine: number; assigned: number }[]>(Prisma.sql`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE x.created_by_id = ${userId})::int AS mine,
             COUNT(*) FILTER (WHERE x.assigned_to_id = ${userId} AND x.created_by_id <> ${userId})::int AS assigned
      FROM (${union}) x ${where}`),
    prisma.$queryRaw<Record<TaskView, number>[]>(Prisma.sql`
      SELECT ${countFor("all")} AS "all", ${countFor("mine")} AS mine, ${countFor("enquiry")} AS enquiry,
             ${countFor("order")} AS "order", ${countFor("payment")} AS payment, ${countFor("completed")} AS completed
      FROM (${union}) x ${baseWhere}`),
  ]);

  return {
    rows: rows.map((r) => ({
      id: r.id,
      description: r.description,
      due_date: r.due_date.toISOString(),
      status: r.status,
      isClientTask: r.is_client_task,
      clientId: r.client_id,
      clientName: r.client_name,
      created_by_id: r.created_by_id,
      assignedTo: { name: r.assigned_name },
      createdBy: { name: r.created_name },
      enquiry: r.enquiry_id ? { id: r.enquiry_id, status: r.enquiry_status ?? "open" } : null,
      kind: r.kind,
    })),
    total: Number(totals[0].total),
    page,
    pageSize: PAGE_SIZE,
    createdByMe: Number(totals[0].mine),
    assignedToMe: Number(totals[0].assigned),
    viewCounts: Object.fromEntries(taskViews.map((v) => [v, Number(views[0][v])])) as Record<TaskView, number>,
  };
}
