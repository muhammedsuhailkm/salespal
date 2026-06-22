import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { KpiCardsSection, KpiCardsSkeleton } from "@/components/dashboard/KpiCardsSection";
import { TasksSection, TasksSkeleton } from "@/components/dashboard/TasksSection";

export default async function SalesmanDashboardPage() {
  return (
    <>
      <PageHeader
        title="My Dashboard"
        subtitle="Your sales performance and activities"
      />

      <div className="space-y-6">
        <Suspense fallback={<KpiCardsSkeleton />}>
          <KpiCardsSection />
        </Suspense>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Suspense fallback={<TasksSkeleton />}>
            <TasksSection />
          </Suspense>
        </div>
      </div>
    </>
  );
}
