export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
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
