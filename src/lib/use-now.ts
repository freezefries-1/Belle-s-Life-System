"use client";

import { useEffect, useState } from "react";

/**
 * Current time in ms, refreshed every second while `active`. Only drives
 * re-renders — elapsed time itself is always computed from timestamps.
 */
export function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(Date.now());
    const id = window.setInterval(tick, 1000);
    // Catch up immediately when returning to a background tab.
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [active]);
  return now;
}
