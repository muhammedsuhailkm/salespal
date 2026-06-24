"use client";

import { useEffect, useState, use } from "react";
import { ClientOverview } from "./ClientOverview";
import ClientOverviewLoading from "./loading";

export default function ClientDetailPage(props: { params: Promise<{ id: string }> }) {
  // Await params using React.use() to read params on the client side in Next.js 15+
  const params = use(props.params);
  const id = params?.id;

  const [data, setData] = useState<{ client: any; tasks: any[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    
    let active = true;

    async function loadData() {
      try {
        const [clientRes, tasksRes] = await Promise.all([
          fetch(`/api/clients/${id}`),
          fetch(`/api/clients/${id}/tasks`)
        ]);

        if (!clientRes.ok || !tasksRes.ok) {
          throw new Error("Failed to load client data");
        }

        const clientData = await clientRes.json();
        const tasksData = await tasksRes.json();

        if (active) {
          setData({
            client: clientData.client,
            tasks: tasksData.tasks
          });
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || "An error occurred");
        }
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [id]);

  if (error) {
    return (
      <div className="p-8 text-center bg-[var(--nm-surface)] rounded-2xl shadow-nm">
        <h3 className="text-sm font-bold text-red-600">Error Loading Client Details</h3>
        <p className="mt-2 text-xs text-slate-500">{error}</p>
      </div>
    );
  }

  if (!data) {
    return <ClientOverviewLoading />;
  }

  return <ClientOverview client={data.client} initialTasks={data.tasks} />;
}
