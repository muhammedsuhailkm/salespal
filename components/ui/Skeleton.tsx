import { cn } from "@/lib/utils";

/** Placeholder block with a soft shimmer while content loads. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton rounded-md", className)} />;
}
