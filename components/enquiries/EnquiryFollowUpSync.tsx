"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Asks the server to raise follow-up tasks for this user's enquiries that have been open 30+ days.
 * Mounted in the salesman / manager layouts, so it runs once per app load rather than on every page.
 */
export function EnquiryFollowUpSync() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/enquiries/follow-ups/sync", { method: "POST" })
      .then((res) => (res.ok ? res.json() : { created: 0 }))
      .then((data) => {
        if (!cancelled && data.created > 0) router.refresh();
      })
      .catch(() => {
        // Non-critical: retried on the next app load.
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
