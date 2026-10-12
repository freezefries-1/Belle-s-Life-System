"use client";

import { useSyncExternalStore } from "react";

import { toISODate } from "@/lib/date";
import type { ISODate } from "@/types";

function subscribe(onChange: () => void) {
  // Re-check once a minute so the app rolls over at midnight.
  const id = window.setInterval(onChange, 60_000);
  return () => window.clearInterval(id);
}

const getSnapshot = () => toISODate(new Date());
const getServerSnapshot = () => null;

/**
 * Today's date in the viewer's own time zone.
 * Returns `null` during server rendering — the server can't know the
 * viewer's local date, so date-dependent UI renders after hydration.
 */
export function useToday(): ISODate | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
