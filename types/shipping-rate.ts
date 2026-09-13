export const containerTypes = ["20gp", "40hc"] as const;
export type ContainerType = (typeof containerTypes)[number];

export type ShippingRateListItem = {
  id: number;
  location: string;
  port: string;
  mode: string;
  container: ContainerType | string;
  price: number;
  updated_by_id: number;
  created_at: string | Date;
  updated_at: string | Date;
  updatedBy?: { name: string };
};
