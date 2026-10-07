"use client";

import { useEffect } from "react";
import { toast } from "sonner";

const FAILURE = /\b(fail|failed|error|couldn't|could not|unable|invalid|not allowed|denied)\b/i;

/**
 * Legacy inline toast API (`<Toast message={…} />`), now routed to the app-wide toaster so
 * every confirmation looks and animates the same. New code can call `toast()` from "sonner" directly.
 */
export function Toast({ message }: { message?: string }) {
  useEffect(() => {
    if (!message) return;
    if (FAILURE.test(message)) toast.error(message);
    else toast.success(message);
  }, [message]);
  return null;
}
