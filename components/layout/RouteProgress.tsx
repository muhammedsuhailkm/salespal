"use client";

import { useState } from "react";
import { useNavigation } from "@/components/layout/NavigationContext";

/** Slim brand-coloured bar along the top edge while a page loads; completes and fades on arrival. */
export function RouteProgress() {
  const { isNavigating } = useNavigation();
  const [wasNavigating, setWasNavigating] = useState(isNavigating);
  const [finishing, setFinishing] = useState(false);
  if (wasNavigating !== isNavigating) {
    setWasNavigating(isNavigating);
    setFinishing(!isNavigating);
  }

  if (!isNavigating && !finishing) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5">
      <div
        key={isNavigating ? "loading" : "done"}
        className={
          isNavigating
            ? "animate-route-progress h-full origin-left bg-primary shadow-[0_0_8px_var(--primary)]"
            : "h-full origin-left bg-primary transition-opacity duration-300 [animation:route-done_350ms_ease-out_forwards]"
        }
        onAnimationEnd={() => !isNavigating && setFinishing(false)}
      />
    </div>
  );
}
