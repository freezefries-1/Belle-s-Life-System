"use client";

import * as React from "react";
import { AlertTriangle, CloudCheck, CloudOff, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAccount, useSyncStatus } from "@/lib/auth/account";
import type { SyncConflict } from "@/lib/repositories/cloud-sync";
import { cn } from "@/lib/utils";

/** Small "Saved / Saving… / Not saved" pill for the top bar (cloud mode only). */
export function SyncIndicator({ className }: { className?: string }) {
  const status = useSyncStatus();
  const online = useOnline();
  if (!status) return null;
  const view = !online
    ? { icon: CloudOff, label: "Offline", tone: "text-amber-700" }
    : status.state === "saving"
      ? { icon: Loader2, label: "Saving…", tone: "text-muted-foreground", spin: true }
      : status.state === "synced"
        ? { icon: CloudCheck, label: "Saved", tone: "text-muted-foreground" }
        : status.state === "conflict"
          ? { icon: AlertTriangle, label: "Needs attention", tone: "text-amber-700" }
          : { icon: CloudOff, label: "Not saved", tone: "text-rose-700" };
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap", view.tone, className)}
      role="status"
      aria-live="polite"
      data-testid="sync-indicator"
      data-state={online ? status.state : "offline"}
      title={status.lastSyncedAt ? `Last synced ${new Date(status.lastSyncedAt).toLocaleTimeString()}` : undefined}
    >
      <view.icon className={cn("size-4", "spin" in view && view.spin && "animate-spin")} />
      <span className="hidden sm:inline">{view.label}</span>
    </span>
  );
}

const TABLE_LABEL: Record<string, string> = {
  tasks: "Task",
  projects: "Project",
  project_milestones: "Milestone",
  recurrence_templates: "Recurring task",
  brain_dump_entries: "Brain Dump entry",
  sprint_sessions: "Focus session",
  sprint_session_tasks: "Session task",
  daily_highlights: "Daily Highlight",
  micro_commitments: "Micro-commitment",
  micro_commitment_completions: "Commitment tick",
  kaizen_logs: "Kaizen Log",
  weekly_reviews: "Weekly review",
  weekly_priorities: "Weekly priority",
};

function conflictTitle(c: SyncConflict) {
  const row = c.server as { title?: string; name?: string; date_key?: string; week_start_date?: string } | null;
  return row?.title ?? row?.name ?? row?.date_key ?? row?.week_start_date ?? "";
}

/**
 * Shown when changes couldn't be saved or clash with another device.
 * Every choice is explicit — nothing is silently discarded.
 */
export function SyncBanner() {
  const status = useSyncStatus();
  const ctx = useAccount();
  const online = useOnline();
  const [busy, setBusy] = React.useState(false);
  if (!status || !ctx) return null;
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  if (status.state === "conflict") {
    // Only edits clashing with newer edits can be forced; the rest can only be set aside.
    const forceable = status.conflicts.some((c) => c.reason === "changed" || c.reason === "deleted");
    return (
      <div role="alert" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-950">
        <p className="flex items-center gap-2 font-semibold">
          <AlertTriangle className="size-4" />
          This changed on another device
        </p>
        <p className="mt-1 text-xs">
          {status.message} Choose which version to keep. Your other changes are unaffected.
        </p>
        <ul className="mt-2 flex flex-col gap-0.5 text-xs">
          {status.conflicts.slice(0, 4).map((c) => (
            <li key={`${c.table}:${c.id}`}>
              • {TABLE_LABEL[c.table] ?? c.table}
              {conflictTitle(c) && `: ${conflictTitle(c)}`} —{" "}
              {c.reason === "deleted"
                ? "deleted elsewhere"
                : c.reason === "duplicate"
                  ? "already exists for that day"
                  : c.reason === "rejected"
                    ? "can’t be saved — something it belongs to was removed on another device"
                    : "edited elsewhere"}
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" disabled={busy} onClick={() => run(() => ctx.engine.resolve("theirs"))}>
            {forceable ? "Load the latest version" : "Set these aside and continue"}
          </Button>
          {forceable && (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => ctx.engine.resolve("mine"))}>
              Keep my changes
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (status.state === "offline" || status.state === "error" || (!online && status.pending > 0)) {
    return (
      <div role="alert" className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-900">
        <CloudOff className="size-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Unable to save changes.</p>
          <p className="text-xs">
            {status.state === "error" && status.message ? status.message : "Check your connection and try again."} {status.pending > 0 && `${status.pending} unsaved ${status.pending === 1 ? "change" : "changes"} kept on this device until then.`}
          </p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 bg-white" disabled={busy} onClick={() => run(() => ctx.engine.retry())}>
          <RefreshCw className="size-3.5" />
          Retry
        </Button>
        {status.state === "error" && (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() =>
              window.confirm("Discard the unsaved changes on this device and load the latest saved data?") && run(() => ctx.engine.discardAndReload())
            }
          >
            Discard unsaved & reload
          </Button>
        )}
      </div>
    );
  }
  return null;
}

/** The page-level fallback when data couldn't be loaded at all. */
export function LoadErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 rounded-2xl border bg-card px-6 py-10 text-center">
      <CloudOff className="size-6 text-muted-foreground" />
      <h2 className="text-lg font-bold">Couldn’t load your workspace</h2>
      <p className="text-[13px] text-muted-foreground">Check your connection and try again. Nothing has been changed.</p>
      <p className="text-[11px] text-subtle-foreground">{message}</p>
      <Button onClick={onRetry} className="gap-1.5">
        <RefreshCw className="size-4" />
        Try again
      </Button>
    </div>
  );
}

function useOnline() {
  return React.useSyncExternalStore(
    (cb) => {
      window.addEventListener("online", cb);
      window.addEventListener("offline", cb);
      return () => {
        window.removeEventListener("online", cb);
        window.removeEventListener("offline", cb);
      };
    },
    () => navigator.onLine,
    () => true,
  );
}
