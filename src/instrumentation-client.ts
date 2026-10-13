import { reportClientError } from "@/lib/monitoring/error-report";

/**
 * Crashes outside a page (an event handler, a failed promise) are reported
 * too — only ones from this app's own code, not browser extensions.
 */
try {
  window.addEventListener("error", (event) => {
    if (!event.error || !event.filename?.startsWith(window.location.origin)) return;
    reportClientError(event.error, "window");
  });
  window.addEventListener("unhandledrejection", (event) => {
    // Being offline isn't a crash (saving retries on its own); the message is only read here, never sent.
    if (event.reason instanceof Error && !/fetch|network|load failed/i.test(event.reason.message)) reportClientError(event.reason, "promise");
  });
} catch {
  // Monitoring must never stop the app from starting.
}
