"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Info } from "lucide-react";

import { DueLabel } from "@/components/shared/task-meta";
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
import { Input } from "@/components/ui/input";
import { SPRINTS, SPRINT_ICONS, SPRINT_STYLES } from "@/data/sprints";
import { ENERGY_OPTIONS, SESSION_DURATIONS } from "@/lib/sessions/session-model";
import { getOpenSession } from "@/lib/selectors";
import { useWorkspace } from "@/lib/store/workspace-store";
import { getManualOrder } from "@/lib/tasks/sprint-board";
import { cn, formatMinutes } from "@/lib/utils";
import type { EnergyLevel, SprintId } from "@/types";

export function PlanSessionDialog({
  open,
  onOpenChange,
  initialSprint,
  initialTaskIds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSprint?: SprintId;
  initialTaskIds?: string[];
}) {
  const { workspace, actions } = useWorkspace();
  const router = useRouter();
  const openSession = getOpenSession(workspace);

  const firstWithTasks = SPRINTS.find((s) => getManualOrder(workspace.tasks, s.id).length > 0)?.id;
  const [sprintId, setSprintId] = React.useState<SprintId>(initialSprint ?? firstWithTasks ?? "urgent");
  const [energy, setEnergy] = React.useState<EnergyLevel | null>(null);
  const [minutes, setMinutes] = React.useState(30);
  const [custom, setCustom] = React.useState("");
  const [selected, setSelected] = React.useState<string[]>(initialTaskIds ?? []);

  const candidates = getManualOrder(workspace.tasks, sprintId);
  const chosen = candidates.filter((t) => selected.includes(t.id));
  const estimate = chosen.reduce((sum, t) => sum + (t.estimatedMinutes ?? 0), 0);
  const unestimated = chosen.filter((t) => t.estimatedMinutes === null).length;
  const planned = custom.trim() ? Math.round(Number(custom)) : minutes;
  const plannedValid = Number.isFinite(planned) && planned >= 1 && planned <= 600;
  const overTime = plannedValid && estimate > planned;

  function chooseSprint(id: SprintId) {
    setSprintId(id);
    setSelected([]);
  }

  function toggle(id: string) {
    setSelected((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  }

  function start() {
    if (!plannedValid || chosen.length === 0) return;
    const session = actions.createSession({
      sprintId,
      taskIds: chosen.map((t) => t.id),
      plannedMinutes: planned,
      energyLevel: energy,
    });
    onOpenChange(false);
    if (session) router.push("/sprints/session");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-4 max-h-[calc(100dvh-2rem)] max-w-xl overflow-y-auto sm:top-[6%] sm:max-h-[88dvh]">
        <DialogHeader>
          <DialogTitle>Plan a session</DialogTitle>
          <DialogDescription>Pick one kind of work and a few tasks. It’s a plan, not a contract.</DialogDescription>
        </DialogHeader>

        {openSession ? (
          <div className="flex flex-col gap-4">
            <p className="flex items-start gap-2 rounded-lg bg-muted/70 px-3 py-2.5 text-[13px]">
              <Info className="mt-0.5 size-4 shrink-0 text-primary" />
              You already have a session open. Finish or end it before planning the next one.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button
                className="gap-1.5"
                onClick={() => {
                  onOpenChange(false);
                  router.push("/sprints/session");
                }}
              >
                Go to current session
                <ArrowRight className="size-4" />
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {/* Optional, unobtrusive energy check-in. It never restricts choices. */}
            <fieldset>
              <legend className="mb-2 text-[13px] font-semibold">
                Energy right now <span className="font-normal text-muted-foreground">(optional)</span>
              </legend>
              <div className="flex flex-wrap gap-1.5">
                {ENERGY_OPTIONS.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    aria-pressed={energy === e.id}
                    onClick={() => setEnergy((cur) => (cur === e.id ? null : e.id))}
                    className={cn(
                      "h-7 cursor-pointer rounded-md border px-2.5 text-xs font-semibold transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none",
                      energy === e.id
                        ? "border-primary/40 bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
              {energy && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {ENERGY_OPTIONS.find((e) => e.id === energy)?.hint} Any sprint is fine.
                </p>
              )}
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-[13px] font-semibold">Sprint</legend>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {SPRINTS.map((s) => {
                  const Icon = SPRINT_ICONS[s.id];
                  const count = getManualOrder(workspace.tasks, s.id).length;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={sprintId === s.id}
                      onClick={() => chooseSprint(s.id)}
                      className={cn(
                        "flex cursor-pointer flex-col items-start gap-1 rounded-lg border px-2.5 py-2 text-left transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none",
                        sprintId === s.id ? "border-primary/50 bg-accent" : "hover:bg-muted",
                      )}
                    >
                      <Icon className={cn("size-4", SPRINT_STYLES[s.id].text)} />
                      <span className="text-xs font-semibold">
                        {s.number}. {s.name}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{count} open</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-[13px] font-semibold">Session length</legend>
              <div className="flex flex-wrap items-center gap-1.5">
                {SESSION_DURATIONS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={!custom && minutes === m}
                    onClick={() => {
                      setMinutes(m);
                      setCustom("");
                    }}
                    className={cn(
                      "h-8 cursor-pointer rounded-md border px-3 text-xs font-semibold transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none",
                      !custom && minutes === m ? "border-primary/40 bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {formatMinutes(m)}
                  </button>
                ))}
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={600}
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                    placeholder="Custom"
                    aria-label="Custom session length in minutes"
                    aria-invalid={!!custom && !plannedValid}
                    className="h-8 w-24"
                  />
                  min
                </label>
              </div>
            </fieldset>

            <fieldset>
              <div className="mb-2 flex items-center justify-between">
                <legend className="text-[13px] font-semibold">Tasks to include</legend>
                {candidates.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelected(chosen.length === candidates.length ? [] : candidates.map((t) => t.id))}
                    className="cursor-pointer text-xs font-semibold text-primary hover:text-primary-strong"
                  >
                    {chosen.length === candidates.length ? "Clear" : "Select all"}
                  </button>
                )}
              </div>
              {candidates.length === 0 ? (
                <p className="rounded-lg border border-dashed px-3 py-4 text-center text-[13px] text-muted-foreground">
                  No open tasks in this sprint yet.
                </p>
              ) : (
                <ul className="flex max-h-60 flex-col gap-1 overflow-y-auto rounded-lg border p-1.5">
                  {candidates.map((t) => {
                    const id = `plan-${t.id}`;
                    return (
                      <li key={t.id} className="flex items-start gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted/60">
                        <Checkbox id={id} checked={selected.includes(t.id)} onCheckedChange={() => toggle(t.id)} className="mt-px" />
                        <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
                          <span className="block text-[13px] leading-snug font-medium">{t.title}</span>
                          <span className="mt-0.5 flex flex-wrap gap-x-2.5 text-xs text-muted-foreground">
                            <span>{t.estimatedMinutes != null ? formatMinutes(t.estimatedMinutes) : "No estimate"}</span>
                            <DueLabel due={t.dueDate} today={workspace.today} />
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </fieldset>

            <div className="rounded-lg bg-muted/60 px-3.5 py-3 text-[13px]" aria-live="polite">
              <p>
                <span className="font-semibold">{chosen.length}</span> {chosen.length === 1 ? "task" : "tasks"} ·{" "}
                <span className="font-semibold">≈ {formatMinutes(estimate)}</span> estimated ·{" "}
                {plannedValid ? `${formatMinutes(planned)} planned` : "enter a length"}
              </p>
              {unestimated > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {unestimated} without an estimate {unestimated === 1 ? "isn’t" : "aren’t"} counted.
                </p>
              )}
              {overTime && (
                <p className="mt-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800">
                  These tasks may need more time than your planned session.
                </p>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={start} disabled={!plannedValid || chosen.length === 0}>
                Set up session
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
