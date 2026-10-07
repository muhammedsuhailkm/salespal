"use client";

import { Button } from "@/components/ui/Button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-lg border border-danger/30 bg-danger-soft p-6">
      <h2 className="text-lg font-semibold text-danger-foreground">Something went wrong</h2>
      <p className="mt-1 text-sm text-danger-foreground">The dashboard could not load.</p>
      <Button className="mt-4" onClick={reset}>Try again</Button>
    </div>
  );
}
