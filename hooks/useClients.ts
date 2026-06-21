"use client";

import { useEffect, useState } from "react";
import type { ClientListItem } from "@/types/client";

export function useClients() {
  const [data, setData] = useState<ClientListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/clients").then((res) => res.json()).then((json) => setData(json.clients ?? [])).finally(() => setLoading(false));
  }, []);

  return { clients: data, loading };
}
