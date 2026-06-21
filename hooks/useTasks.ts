"use client";

import { useEffect, useState } from "react";
import type { TaskListItem } from "@/types/task";

export function useTasks() {
  const [data, setData] = useState<TaskListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tasks").then((res) => res.json()).then((json) => setData(json.tasks ?? [])).finally(() => setLoading(false));
  }, []);

  return { tasks: data, loading };
}
