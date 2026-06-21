import { formatDate } from "@/lib/utils";

type FeedItem = { id: number; action: string; created_at: Date | string; author?: { name: string | null } };

export function ActivityFeed({ items }: { items: FeedItem[] }) {
  return <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">{items.map((item) => <div className="p-4" key={item.id}><p className="text-sm font-medium text-slate-900">{item.action}</p><p className="mt-1 text-xs text-slate-500">{item.author?.name ?? "System"} - {formatDate(item.created_at)}</p></div>)}</div>;
}
