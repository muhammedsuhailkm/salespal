export const clientStatuses = ["new_lead", "follow_up", "onboarded", "lost", "target"] as const;
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
