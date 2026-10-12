"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Pause, Play, Square, Timer } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { DueLabel, EstimateLabel } from "@/components/shared/task-meta";
import { useTaskEditor } from "@/components/tasks/task-editor-provider";
import { useTaskFeedback } from "@/components/tasks/use-task-feedback";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { SPRINT_BY_ID, SPRINT_ICONS, SPRINT_STYLES } from "@/data/sprints";
import { ENERGY_OPTIONS, formatDuration, summarizeSession } from "@/lib/sessions/session-model";
import { getOpenSession } from "@/lib/selectors";
import { useWorkspace } from "@/lib/store/workspace-store";
import { useNow } from "@/lib/use-now";
import { cn, formatMinutes } from "@/lib/utils";
import type { SprintSession } from "@/types";

import { useSessionPlanner } from "./session-planner-provider";
import { SessionHistory } from "./session-history";

export function SessionView() {
  const { workspace } = useWorkspace();
  const planner = useSessionPlanner();
  const session = getOpenSession(workspace);
  // Remember the session ended on this page so its summary stays visible.
  const [endedId, setEndedId] = React.useState<string | null>(null);
  const ended = endedId ? workspace.sessions.find((s) => s.id === endedId) : undefined;

  if (session) return <ActiveSession session={session} onEnded={setEndedId} />;
  if (ended) return <SessionSummary session={ended} />;

  return (
    <div className="flex flex-col gap-5">
      <BackLink />
      <PageHeader
        title="Focus session"
        description="One sprint, a few tasks, a length you choose. Starting a timer is always optional."
        className="mb-0 lg:mb-0"
      />
      <Card className="py-10">
        <EmptyState
          icon={Timer}
          title="No session running"
          description="Plan a short, focused session: one sprint, a few tasks, a time you choose."
          className="py-0"
        />
        <div className="mt-4 flex justify-center">
          <Button onClick={() => planner.open()}>Plan a session</Button>
        </div>
      </Card>
      <SessionHistory />
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/sprints"
      className="inline-flex items-center gap-1.5 self-start text-xs font-semibold text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-3.5" />
      Back to Sprints
    </Link>
  );
}

function ActiveSession({ session, onEnded }: { session: SprintSession; onEnded: (id: string) => void }) {
  const { workspace, actions } = useWorkspace();
  const feedback = useTaskFeedback();
  const editor = useTaskEditor();
  const [confirming, setConfirming] = React.useState(false);
  const now = useNow(session.status === "running");
  const summary = summarizeSession(session, workspace.tasks, now);
  const sprint = SPRINT_BY_ID[session.sprintId];
  const style = SPRINT_STYLES[session.sprintId];
  const Icon = SPRINT_ICONS[session.sprintId];
  const timePct = Math.min(100, (summary.elapsedSeconds / summary.plannedSeconds) * 100);
  const overTime = summary.elapsedSeconds > summary.plannedSeconds;
  const energy = ENERGY_OPTIONS.find((e) => e.id === session.energyLevel);

  return (
    <div className="flex flex-col gap-5">
      <BackLink />

      <section
        aria-label="Session timer"
        className="relative overflow-hidden rounded-xl border border-ink-border/60 bg-ink p-5 text-ink-foreground shadow-[0_8px_24px_-12px_rgba(16,24,39,0.5)] sm:p-7"
      >
        <span className={cn("absolute inset-x-0 top-0 h-[3px]", style.bar)} aria-hidden />
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-ink-2">
            <Icon className="size-4 text-primary-hover" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold tracking-[0.08em] text-ink-muted uppercase">
              {session.status === "ready" ? "Ready when you are" : session.status === "paused" ? "Paused" : "Focus session"}
            </p>
            <h2 className="text-lg font-semibold">
              Sprint {sprint.number}: {sprint.name}
            </h2>
          </div>
          {energy && (
            <span className="rounded-md border border-ink-border px-2 py-0.5 text-[11px] font-semibold text-ink-muted">
              {energy.label}
            </span>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <p role="timer" aria-label="Elapsed time" className="text-5xl font-bold tracking-tight tabular-nums sm:text-6xl">
            {formatDuration(summary.elapsedSeconds)}
          </p>
          <p className="text-[13px] text-ink-muted tabular-nums">
            of {formatMinutes(session.plannedMinutes)} planned
            {overTime && " · past your plan, and that’s okay"}
          </p>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-ink-border/60">
          <div
            className={cn("h-full rounded-full transition-[width] duration-1000 ease-linear", overTime ? "bg-amber-400" : "bg-primary")}
            style={{ width: `${timePct}%` }}
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {session.status === "ready" && (
            <Button onClick={() => actions.startSession(session.id)} className="gap-1.5">
              <Play className="size-4" />
              Start
            </Button>
          )}
          {session.status === "running" && (
            <Button variant="ink" onClick={() => actions.pauseSession(session.id)} className="gap-1.5">
              <Pause className="size-4" />
              Pause
            </Button>
          )}
          {session.status === "paused" && (
            <Button onClick={() => actions.startSession(session.id)} className="gap-1.5">
              <Play className="size-4" />
              Resume
            </Button>
          )}
          <Button variant="ink-ghost" onClick={() => setConfirming(true)} className="gap-1.5">
            <Square className="size-3.5" />
            End session
          </Button>
          <p className="w-full text-xs text-ink-muted sm:ml-auto sm:w-auto">The timer never ticks tasks off for you.</p>
        </div>
      </section>

      <Card className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold">Session tasks</h3>
          <span className="text-xs font-semibold text-muted-foreground tabular-nums">
            {summary.completed} of {summary.tasks.length} done
          </span>
        </div>
        <Progress
          value={summary.tasks.length ? (summary.completed / summary.tasks.length) * 100 : 0}
          className="mt-3"
          indicatorClassName="bg-emerald-500"
          aria-label="Session task progress"
        />
        {summary.tasks.length === 0 ? (
          <p className="mt-4 text-[13px] text-muted-foreground">The tasks in this session have been deleted.</p>
        ) : (
          <ul className="mt-3 flex flex-col">
            {summary.tasks.map((t) => {
              const done = t.status === "completed";
              return (
                <li key={t.id} className="flex items-start gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/60">
                  <Checkbox
                    checked={done}
                    onCheckedChange={() => feedback.toggleComplete(t)}
                    aria-label={done ? `Reopen “${t.title}”` : `Complete “${t.title}”`}
                    className="mt-[3px] size-5"
                  />
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => editor.openEdit(t.id)}
                      className={cn(
                        "cursor-pointer text-left text-[14px] leading-snug font-medium hover:text-primary",
                        done && "text-muted-foreground line-through decoration-slate-300",
                      )}
                    >
                      {t.title}
                    </button>
                    <div className="mt-1 flex flex-wrap gap-x-3">
                      <EstimateLabel minutes={t.estimatedMinutes} />
                      {!done && <DueLabel due={t.dueDate} today={workspace.today} />}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>End this session?</DialogTitle>
            <DialogDescription>Unfinished tasks stay exactly where they are — nothing is moved or rescheduled.</DialogDescription>
          </DialogHeader>
          <SummaryGrid
            planned={summary.plannedSeconds}
            elapsed={summary.elapsedSeconds}
            completed={summary.completed}
            remaining={summary.remaining}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              Keep going
            </Button>
            <Button
              onClick={() => {
                const ended = actions.endSession(session.id);
                setConfirming(false);
                if (ended) onEnded(ended.id);
              }}
            >
              End session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryGrid({
  planned,
  elapsed,
  completed,
  remaining,
}: {
  planned: number;
  elapsed: number;
  completed: number;
  remaining: number;
}) {
  const items = [
    { label: "Planned", value: formatDuration(planned) },
    { label: "Actual", value: formatDuration(elapsed) },
    { label: "Completed", value: String(completed) },
    { label: "Remaining", value: String(remaining) },
  ];
  return (
    <dl className="grid grid-cols-2 gap-2.5">
      {items.map((i) => (
        <div key={i.label} className="rounded-lg bg-muted/60 px-3 py-2.5">
          <dt className="text-[11px] font-semibold text-muted-foreground">{i.label}</dt>
          <dd className="mt-0.5 text-lg font-bold tabular-nums">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function SessionSummary({ session }: { session: SprintSession }) {
  const { workspace } = useWorkspace();
  const planner = useSessionPlanner();
  const summary = summarizeSession(session, workspace.tasks, Date.parse(session.endedAt ?? session.createdAt));
  const sprint = SPRINT_BY_ID[session.sprintId];

  return (
    <div className="flex flex-col gap-5">
      <BackLink />
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="size-5 text-emerald-600" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Session complete</h2>
            <p className="text-[13px] text-muted-foreground">
              Sprint {sprint.number}: {sprint.name}. Whatever got done counts.
            </p>
          </div>
        </div>
        <div className="mt-5">
          <SummaryGrid
            planned={summary.plannedSeconds}
            elapsed={summary.elapsedSeconds}
            completed={summary.completed}
            remaining={summary.remaining}
          />
        </div>
        {summary.remaining > 0 && (
          <p className="mt-4 text-[13px] text-muted-foreground">
            {summary.remaining} {summary.remaining === 1 ? "task stays" : "tasks stay"} in {sprint.name}, ready for next time.
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/sprints">Back to Sprints</Link>
          </Button>
          <Button onClick={() => planner.open({ sprintId: session.sprintId })}>Plan another session</Button>
        </div>
      </Card>
      <SessionHistory />
    </div>
  );
}
