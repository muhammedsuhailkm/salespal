export const clientStatuses = [
  "lead",
  "contacted",
  "follow_up",
  "proposal_sent",
  "negotiation",
  "onboarding_in_progress",
  "onboarded",
  "active_client",
  "inactive",
  "lost",
  "cancelled"
] as const;
export type ClientStatus = (typeof clientStatuses)[number];

export type ClientListItem = {
  id: number;
  name: string;
  contact_person_name: string;
  contact_no: string;
  status: ClientStatus | string;
  organization?: { name: string };
  assignedSalesman?: { name: string };
};

export type ClientLogItem = {
  id: number;
  action: string;
  created_at: string;
  author?: { name: string };
};
