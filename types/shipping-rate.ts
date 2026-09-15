export const containerTypes = ["20gp", "40hc"] as const;
export type ContainerType = (typeof containerTypes)[number];

export const commonCarriers = [
  "MSC",
  "Maersk",
  "CMA CGM",
  "COSCO",
  "Hapag-Lloyd",
  "ONE",
  "Evergreen",
  "Yang Ming",
  "HMM",
  "ZIM",
] as const;

export const currencyTypes = ["USD", "QAR"] as const;
export type CurrencyType = (typeof currencyTypes)[number];

export type ShippingRateListItem = {
  id: number;
  location: string;
  port: string;
  carrier?: string | null;
  currency?: CurrencyType | string | null;
  mode: string;
  container: ContainerType | string;
  price: number;
  updated_by_id: number;
  created_at: string | Date;
  updated_at: string | Date;
  updatedBy?: { name: string };
};

