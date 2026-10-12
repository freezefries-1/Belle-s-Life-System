"use client";

import Link from "next/link";
import { ArrowRight, Timer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SPRINT_BY_ID, SPRINT_ICONS } from "@/data/sprints";
import { formatDuration, summarizeSession } from "@/lib/sessions/session-model";
import { getOpenSession } from "@/lib/selectors";
import { useWorkspace } from "@/lib/store/workspace-store";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

/** Compact "you have a session going" strip for the Today and Sprints pages. */
export function CurrentSessionWidget({ className }: { className?: string }) {
  const { workspace } = useWorkspace();
  const session = getOpenSession(workspace);
  const now = useNow(session?.status === "running");
  if (!session) return null;

  const summary = summarizeSession(session, workspace.tasks, now);
  const sprint = SPRINT_BY_ID[session.sprintId];
  const Icon = SPRINT_ICONS[session.sprintId];
  const label =
    session.status === "running" ? "Session in progress" : session.status === "paused" ? "Session paused" : "Session ready to start";

  return (
    <section
      aria-label="Current session"
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-ink-border/60 bg-ink px-4 py-3.5 text-ink-foreground sm:flex-row sm:items-center",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="relative flex size-9 shrink-0 items-center justify-center rounded-lg bg-ink-2">
          <Icon className="size-4 text-primary-hover" />
          {session.status === "running" && (
            <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2 border-ink bg-emerald-400" />
          )}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-wide text-ink-muted uppercase">{label}</p>
          <p className="truncate text-[14px] font-semibold">
            Sprint {sprint.number}: {sprint.name}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4 text-[13px] text-ink-muted">
        <span className="inline-flex items-center gap-1.5 tabular-nums">
          <Timer className="size-3.5" />
          <span className="font-semibold text-ink-foreground">{formatDuration(summary.elapsedSeconds)}</span>
          <span>/ {formatDuration(summary.plannedSeconds)}</span>
        </span>
        <span className="tabular-nums">
          {summary.remaining} {summary.remaining === 1 ? "task" : "tasks"} left
        </span>
        <Button asChild size="sm" className="gap-1.5">
          <Link href="/sprints/session">
            {session.status === "ready" ? "Open session" : "Resume session"}
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
