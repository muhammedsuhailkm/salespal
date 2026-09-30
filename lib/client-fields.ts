export function normalizeCrNo(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;

  return value.trim().toUpperCase() || null;
}

export function parseCrExpiryDate(value: unknown):
  | { valid: true; value: Date | null | undefined }
  | { valid: false } {
  if (value === undefined) return { valid: true, value: undefined };
  if (value === null || value === "") return { valid: true, value: null };
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { valid: false };
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return { valid: false };
  }

  return { valid: true, value: date };
}