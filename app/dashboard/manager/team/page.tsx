import { Suspense } from "react";
import { getSalesPalSession } from "@/lib/auth";
import { getCachedManagerTeamPageData } from "@/lib/cached-queries";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { ManagerTeamClient } from "./ManagerTeamClient";

export default function TeamPage() {
  return (
    <>
      <PageHeader title="Team" subtitle="Salesmen assigned to you." />
      <Suspense fallback={<TeamSkeleton />}>
        <TeamSection />
      </Suspense>
    </>
  );
}

async function TeamSection() {
  const session = await getSalesPalSession();
  const salesmen = await getCachedManagerTeamPageData(session!.user.id);

  return <ManagerTeamClient initialSalesmen={salesmen} />;
}

function TeamSkeleton() {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3.5 flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
        <div className="divide-y divide-slate-100">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-5 py-3.5 flex items-center gap-4">
              <Skeleton className="h-9 w-9 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
