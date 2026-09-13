"use client";

import { useEffect, useState } from "react";
import type { ShippingRateListItem } from "@/types/shipping-rate";

export function useShippingRates() {
  const [data, setData] = useState<ShippingRateListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/shipping-rates").then((res) => res.json()).then((json) => setData(json.rates ?? [])).finally(() => setLoading(false));
  }, []);

  return { rates: data, loading };
}
