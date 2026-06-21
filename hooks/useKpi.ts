"use client";

import { useEffect, useState } from "react";

export function useKpi(userId: number) {
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/kpi/${userId}`).then((res) => res.json()).then((json) => setScore(json.score ?? null));
  }, [userId]);

  return { score };
}
