import type { ClientStatus } from "@/types/client";

/**
 * One colour per client pipeline status, used by dots, legends, menu items and the pipeline bar.
 * The badge (components/ui/Badge) uses the same hues. Pipeline stages keep distinct hues because
 * they're data people scan for; onboarded / lost / dormant follow the semantic tokens.
 */
export const clientStatusDot: Record<ClientStatus, string> = {
  lead: "bg-amber-500",
  contacted: "bg-sky-500",
  follow_up: "bg-indigo-500",
  enquiry: "bg-violet-500",
  onboarded: "bg-success",
  dormant: "bg-muted-foreground",
  lost: "bg-danger",
  blacklisted: "bg-foreground",
};

export function clientStatusDotClass(status: string) {
  return clientStatusDot[status as ClientStatus] ?? "bg-muted-foreground";
}
