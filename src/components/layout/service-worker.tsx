"use client";

import * as React from "react";

/**
 * Registers the service worker (public/sw.js) in production builds only, so
 * development always sees fresh files. It caches static files only — see sw.js.
 */
export function ServiceWorkerRegistration() {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // Not essential: the app works the same without it.
    });
  }, []);
  return null;
}
