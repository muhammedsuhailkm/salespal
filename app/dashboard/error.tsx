"use client";

import { Button } from "@/components/ui/Button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6">
      <h2 className="text-lg font-semibold text-red-950">Something went wrong</h2>
      <p className="mt-1 text-sm text-red-700">The dashboard could not load.</p>
      <Button className="mt-4" onClick={reset}>Try again</Button>
    </div>
  );
}
