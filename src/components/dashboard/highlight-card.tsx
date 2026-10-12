"use client";

import * as React from "react";
import { Check, Clock, FolderOpen, Pause, Pencil, Play, RotateCcw, Star } from "lucide-react";

import { SprintBadge } from "@/components/shared/sprint-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getHighlightTask, getProject, getTodayTasks } from "@/lib/selectors";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn, formatMinutes } from "@/lib/utils";

export function HighlightCard({ className }: { className?: string }) {
  const { workspace, actions } = useWorkspace();
  const [editing, setEditing] = React.useState(false);
  const task = getHighlightTask(workspace);
  const project = task ? getProject(workspace, task.projectId) : null;
  const done = task?.status === "done";

  return (
    <section
      aria-labelledby="highlight-heading"
      className={cn(
        "relative flex flex-col overflow-hidden rounded-xl border border-ink-border/60 bg-ink p-5 text-ink-foreground shadow-[0_8px_24px_-12px_rgba(16,24,39,0.5)] sm:p-6",
        className,
      )}
    >
      {/* Single quiet accent line — the only colour on the card. */}
      <span className="absolute inset-x-0 top-0 h-[3px] bg-primary" aria-hidden />

      <div className="flex items-center justify-between gap-3">
        <p
          id="highlight-heading"
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] text-ink-muted uppercase"
        >
          <Star className="size-3.5 fill-amber-400 text-amber-400" />
          Today’s highlight
        </p>
        <Button variant="ink-ghost" size="xs" onClick={() => setEditing(true)} className="gap-1.5">
          <Pencil className="size-3.5" />
          {task ? "Change" : "Choose"}
        </Button>
      </div>

      {task ? (
        <div className="mt-4 flex flex-1 flex-col">
          <div className="flex items-start gap-3.5">
            <Checkbox
              checked={done}
              onCheckedChange={() => actions.toggleTask(task.id)}
              aria-label={done ? "Mark highlight as not done" : "Mark highlight as done"}
              className="mt-1.5 size-6 rounded-md border-ink-border bg-ink-2 hover:border-primary-hover data-[state=checked]:border-primary"
            />
            <h3
              className={cn(
                "text-[21px] leading-snug font-semibold tracking-tight sm:text-[23px]",
                done && "text-ink-muted line-through decoration-ink-border",
              )}
            >
              {task.title}
            </h3>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 pl-[38px] text-[13px] text-ink-muted">
            <SprintBadge sprintId={task.sprintId} variant="ink" className="text-[13px]" />
            {project && (
              <span className="inline-flex items-center gap-1.5">
                <FolderOpen className="size-3.5" />
                {project.name}
              </span>
            )}
            {task.estimateMinutes != null && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5" />
                {formatMinutes(task.estimateMinutes)}
              </span>
            )}
          </div>

          <div className="mt-auto pt-6">
            {done ? (
              <p className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-[13px] font-semibold text-emerald-300">
                <Check className="size-4" />
                Highlight done. Everything else today is a bonus.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                <FocusTimer key={task.id} estimateMinutes={task.estimateMinutes} />
                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={() => actions.toggleTask(task.id)} className="gap-1.5">
                    <Check className="size-4" />
                    Mark complete
                  </Button>
                  <p className="text-xs text-ink-muted">If you only do one thing today, make it this.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-1 flex-col items-start justify-center gap-3">
          <p className="text-[18px] font-semibold">What would make today feel worthwhile?</p>
          <Button onClick={() => setEditing(true)}>Choose a highlight</Button>
        </div>
      )}

      <HighlightPicker open={editing} onOpenChange={setEditing} />
    </section>
  );
}

function HighlightPicker({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { workspace, actions } = useWorkspace();
  const candidates = React.useMemo(() => {
    const today = getTodayTasks(workspace).filter((t) => t.status !== "done");
    const rest = workspace.tasks.filter((t) => t.status !== "done" && !today.includes(t));
    return [...today, ...rest];
  }, [workspace]);
  const [selected, setSelected] = React.useState(workspace.highlightTaskId);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setSelected(workspace.highlightTaskId);
        onOpenChange(next);
      }}
    >
      <DialogContent className="top-[10%] max-w-lg">
        <DialogHeader>
          <DialogTitle>Choose today’s highlight</DialogTitle>
          <DialogDescription>Pick the one task that would make today feel like a win.</DialogDescription>
        </DialogHeader>
        <div className="-mx-1 max-h-[50vh] overflow-y-auto px-1" role="radiogroup" aria-label="Tasks">
          {candidates.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={selected === t.id}
              onClick={() => setSelected(t.id)}
              className={cn(
                "flex w-full cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none",
                selected === t.id ? "border-primary/40 bg-accent" : "border-transparent hover:bg-muted",
              )}
            >
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full border",
                  selected === t.id ? "border-primary bg-primary" : "border-slate-300",
                )}
              >
                {selected === t.id && <span className="size-1.5 rounded-full bg-white" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">{t.title}</span>
                <SprintBadge sprintId={t.sprintId} className="mt-0.5" />
              </span>
              {t.estimateMinutes != null && (
                <span className="shrink-0 text-xs text-muted-foreground">{formatMinutes(t.estimateMinutes)}</span>
              )}
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!selected}
            onClick={() => {
              actions.setHighlight(selected);
              onOpenChange(false);
            }}
          >
            Set as highlight
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * A lightweight start/pause timer. Lowers the barrier to starting and makes
 * time visible against the estimate. Local only — not recorded in Phase 1.
 */
function FocusTimer({ estimateMinutes }: { estimateMinutes: number | null }) {
  const [running, setRunning] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const target = (estimateMinutes ?? 25) * 60;
  const pct = Math.min(100, (elapsed / target) * 100);
  const over = elapsed > target;

  React.useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  return (
    <div className="rounded-lg border border-ink-border/70 bg-ink-2/60 p-3.5">
      <div className="flex items-center gap-3">
        <Button
          variant={running ? "ink" : "default"}
          size="icon-sm"
          onClick={() => setRunning((r) => !r)}
          aria-label={running ? "Pause focus timer" : elapsed ? "Resume focus timer" : "Start focus timer"}
          className="rounded-full"
        >
          {running ? <Pause className="size-4" /> : <Play className="size-4 translate-x-px" />}
        </Button>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold">
            {running ? "Focusing…" : elapsed ? "Paused" : "Start a focus session"}
          </p>
          <p className="text-xs text-ink-muted">
            {elapsed === 0
              ? `Just begin — ${estimateMinutes ?? 25} minutes on the clock.`
              : over
                ? "Past your estimate — useful to know for next time."
                : "Pause any time. Coming back counts."}
          </p>
        </div>
        <p className="text-[15px] font-semibold tabular-nums" aria-live="off">
          {formatClock(elapsed)}
          <span className="text-ink-muted"> / {formatClock(target)}</span>
        </p>
        {elapsed > 0 && !running && (
          <Button variant="ink-ghost" size="icon-xs" onClick={() => setElapsed(0)} aria-label="Reset timer">
            <RotateCcw className="size-3.5" />
          </Button>
        )}
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-ink-border/60">
        <div
          className={cn("h-full rounded-full transition-[width] duration-1000 ease-linear", over ? "bg-amber-400" : "bg-primary")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
