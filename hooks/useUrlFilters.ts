"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Filters / search / page live in the URL so the server can paginate and filter.
 * Updates go through a transition: the current page stays interactive while the next one loads.
 */
export function useUrlFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const get = useCallback((key: string, fallback = "") => searchParams.get(key) ?? fallback, [searchParams]);

  /** Set (or clear with "" / null) several params at once. Any filter change resets to page 1. */
  const set = useCallback(
    (updates: Record<string, string | number | null | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined || value === "" || value === "all") next.delete(key);
        else next.set(key, String(value));
      }
      if (!("page" in updates)) next.delete("page");
      const qs = next.toString();
      startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    },
    [pathname, router, searchParams]
  );

  const reset = useCallback(
    (keep: string[] = []) => {
      const next = new URLSearchParams();
      for (const key of keep) {
        const value = searchParams.get(key);
        if (value) next.set(key, value);
      }
      const qs = next.toString();
      startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    },
    [pathname, router, searchParams]
  );

  return { get, set, reset, isPending };
}

/** Text input bound to a URL param, pushed after the user stops typing. */
export function useDebouncedParam(key: string, set: (u: Record<string, string>) => void, current: string, delay = 350) {
  const [value, setValue] = useState(current);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPushed = useRef(current);

  // Follow external URL changes (reset, back/forward) without clobbering what the user is typing.
  useEffect(() => {
    if (current !== lastPushed.current) {
      lastPushed.current = current;
      setValue(current);
    }
  }, [current]);

  const onChange = (next: string) => {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      lastPushed.current = next.trim();
      set({ [key]: next.trim() });
    }, delay);
  };

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return [value, onChange] as const;
}
