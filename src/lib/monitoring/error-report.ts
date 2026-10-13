/**
 * Free, self-hosted crash reporting: a short report goes to this app's own
 * server, which writes it to the Vercel logs. It deliberately contains no
 * error message (which could quote something you typed) — only the kind of
 * error, the page's path, Next's reference code and where in the code it
 * happened.
 */

export type ErrorSource = "page" | "app" | "window" | "promise";

export interface ErrorReport {
  source: ErrorSource;
  /** e.g. TypeError — never the message. */
  name: string;
  digest: string | null;
  /** Path only: no query string or hash. */
  path: string;
  /** Code locations only (function and file:line), first line of the stack dropped. */
  frames: string[];
  at: string;
}

export const REPORT_URL = "/api/client-error";
const MAX_PER_PAGE_LOAD = 5;
const MAX_FRAMES = 8;
const MAX_FRAME = 200;
const NAME = /^[A-Za-z][\w$.]{0,59}$/;

/** Keep only lines that look like stack frames; strip query strings and anything after a frame's location. */
export function codeFrames(stack: unknown): string[] {
  if (typeof stack !== "string") return [];
  return stack
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^at\s/.test(l) || /^[\w$.<>]*@\S+:\d+:\d+$/.test(l))
    .map((l) => l.replace(/[?#][^\s:)]*(?=:\d+:\d+)/g, "").slice(0, MAX_FRAME))
    .slice(0, MAX_FRAMES);
}

export function buildReport(error: unknown, source: ErrorSource, path: string): ErrorReport {
  const e = (typeof error === "object" && error !== null ? error : {}) as { name?: unknown; digest?: unknown; stack?: unknown };
  const name = typeof e.name === "string" && NAME.test(e.name) ? e.name : "Error";
  const digest = typeof e.digest === "string" && /^[\w-]{1,64}$/.test(e.digest) ? e.digest : null;
  return { source, name, digest, path: path.split(/[?#]/)[0].slice(0, 200), frames: codeFrames(e.stack), at: new Date().toISOString() };
}

let sent = 0;
const seen = new Set<string>();

/** Report a crash. Never throws; at most a few per page load, and each distinct crash once. */
export function reportClientError(error: unknown, source: ErrorSource) {
  try {
    if (typeof window === "undefined" || sent >= MAX_PER_PAGE_LOAD) return;
    const report = buildReport(error, source, window.location.pathname);
    const key = `${report.name}|${report.frames[0] ?? ""}|${report.path}`;
    if (seen.has(key)) return;
    seen.add(key);
    sent++;
    const body = JSON.stringify(report);
    const ok = navigator.sendBeacon?.(REPORT_URL, new Blob([body], { type: "application/json" }));
    if (!ok) void fetch(REPORT_URL, { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
  } catch {
    // Reporting must never cause a second problem.
  }
}
