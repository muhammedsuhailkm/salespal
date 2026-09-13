"use client";

import { useEffect, useState } from "react";
import type { OrderListItem } from "@/types/order";

export function useOrders() {
  const [data, setData] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orders").then((res) => res.json()).then((json) => setData(json.orders ?? [])).finally(() => setLoading(false));
  }, []);

  return { orders: data, loading };
}
