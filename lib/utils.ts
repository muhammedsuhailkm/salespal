import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Join class names; later Tailwind utilities win over conflicting earlier ones. */
export function cn(...classes: ClassValue[]) {
  return twMerge(clsx(classes));
}

export function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatAmount(value: number | string) {
  return new Intl.NumberFormat("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value));
}

export function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

/** Whole-number counts: 1,234 */
export function formatNumber(value: number | string) {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(Number(value));
}

/** Measurements (weight, CBM): grouped, up to 3 decimals, no trailing zeros — 1,250 · 12.5 */
export function formatQuantity(value: number | string) {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 3 }).format(Number(value));
}

/** Compact figures for KPI tiles: 12.4K */
export function formatCompact(value: number | string) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value));
}

/** Money with its currency: "QAR 1,250.00" or "$1,250.00" — same convention as the shipping rate table. */
export function formatCurrency(value: number | string, currency: string) {
  return currency === "USD" ? `$${formatAmount(value)}` : `${currency} ${formatAmount(value)}`;
}

/** Percentage from a 0–100 value: 42.5% */
export function formatPercent(value: number | string, fractionDigits = 0) {
  return `${Number(value).toFixed(fractionDigits)}%`;
}

export function formatPhoneNumber(phone: string | null | undefined) {
  if (!phone) return "-";
  const trimmed = phone.trim();
  if (trimmed.startsWith("+974")) {
    return `+974 ${trimmed.slice(4)}`;
  }
  if (trimmed.startsWith("+91")) {
    return `+91 ${trimmed.slice(3)}`;
  }
  if (trimmed.startsWith("+1")) {
    return `+1 ${trimmed.slice(2)}`;
  }
  return trimmed;
}
