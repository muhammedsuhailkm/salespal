/** Shared helpers for server-paginated, URL-driven list pages. */

export const PAGE_SIZE = 50;

export type SearchParams = Record<string, string | string[] | undefined>;

export function param(params: SearchParams, key: string): string | undefined {
  const value = params[key];
  const first = Array.isArray(value) ? value[0] : value;
  return first?.trim() || undefined;
}

export function intParam(params: SearchParams, key: string): number | undefined {
  const value = Number(param(params, key));
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

export function pageParam(params: SearchParams) {
  return intParam(params, "page") ?? 1;
}

export function paging(page: number, pageSize = PAGE_SIZE) {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

export type Paged<T> = { rows: T[]; total: number; page: number; pageSize: number };

/** "Date added" presets used by list filters. Day boundaries are the server's local days. */
export function dateRange(preset: string | undefined, customDate?: string): { gte: Date; lt: Date } | undefined {
  if (!preset || preset === "all") return undefined;
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const today = startOfDay(new Date());
  switch (preset) {
    case "today":
      return { gte: today, lt: addDays(today, 1) };
    case "yesterday":
      return { gte: addDays(today, -1), lt: today };
    case "week":
      return { gte: addDays(today, -7), lt: addDays(today, 1) };
    case "month":
      return { gte: addDays(today, -30), lt: addDays(today, 1) };
    case "custom": {
      if (!customDate || !/^\d{4}-\d{2}-\d{2}$/.test(customDate)) return undefined;
      const [y, m, d] = customDate.split("-").map(Number);
      const day = new Date(y, m - 1, d);
      return { gte: day, lt: addDays(day, 1) };
    }
    default:
      return undefined;
  }
}

/** Escapes LIKE wildcards so `contains` matches the text literally (Prisma passes `_` and `%` through as wildcards). */
export function literal(text: string) {
  return text.replace(/[\\%_]/g, (m) => `\\${m}`);
}
