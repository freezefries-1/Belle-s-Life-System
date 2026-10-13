import { buildReport, codeFrames, type ErrorSource } from "@/lib/monitoring/error-report";

const SOURCES: ErrorSource[] = ["page", "app", "window", "promise"];
const MAX_BODY = 8 * 1024;

/**
 * Receives crash reports from the app and writes one line to the server log
 * (Vercel → Logs, search "client-error"). Everything is re-checked here, so
 * only the expected fields, in the expected shape, are ever logged.
 */
export async function POST(request: Request) {
  const text = await request.text();
  if (text.length > MAX_BODY) return new Response(null, { status: 413 });
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }
  if (typeof raw !== "object" || raw === null) return new Response(null, { status: 400 });

  const source = SOURCES.includes(raw.source as ErrorSource) ? (raw.source as ErrorSource) : "window";
  const path = typeof raw.path === "string" && raw.path.startsWith("/") ? raw.path : "/";
  const frames = Array.isArray(raw.frames) ? codeFrames(raw.frames.filter((f) => typeof f === "string").join("\n")) : [];
  const report = { ...buildReport({ name: raw.name, digest: raw.digest }, source, path), frames };
  console.error(`[client-error] ${JSON.stringify(report)}`);
  return new Response(null, { status: 204 });
}
