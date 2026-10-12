"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock, Plus } from "lucide-react";

import { SectionHeader } from "@/components/shared/page-header";
import { useSessionPlanner } from "@/components/sprints/session-planner-provider";
import { useTaskEditor } from "@/components/tasks/task-editor-provider";
import { useTaskFeedback } from "@/components/tasks/use-task-feedback";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { SPRINTS, SPRINT_ICONS, SPRINT_STYLES } from "@/data/sprints";
import { relativeDayPhrase } from "@/lib/date";
import { useWorkspace } from "@/lib/store/workspace-store";
import { getManualOrder, getSprintProgress } from "@/lib/tasks/sprint-board";
import { cn } from "@/lib/utils";
import type { Sprint } from "@/types";

export function SprintOverview({ className }: { className?: string }) {
  const { workspace } = useWorkspace();
  const planner = useSessionPlanner();
  const unassigned = getManualOrder(workspace.tasks, "unassigned").length;

  return (
    <section className={cn("flex flex-col gap-4", className)} aria-labelledby="sprints-heading">
      <SectionHeader
        title={<span id="sprints-heading">Sprints</span>}
        description="Four kinds of work. Start with whichever fits your energy."
        action={
          <span className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => planner.open()}
              className="cursor-pointer text-xs font-semibold text-primary hover:text-primary-hover"
            >
              Plan a session
            </button>
            <Link href="/sprints" className="text-xs font-semibold text-primary hover:text-primary-hover">
              Open board
            </Link>
          </span>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {SPRINTS.map((sprint) => (
          <SprintCard key={sprint.id} sprint={sprint} />
        ))}
      </div>
      {unassigned > 0 && (
        <p className="text-xs text-muted-foreground">
          {unassigned} open {unassigned === 1 ? "task has" : "tasks have"} no sprint yet —{" "}
          <Link href="/sprints#unassigned" className="font-semibold text-primary hover:text-primary-hover">
            sort them on the board
          </Link>
        </p>
      )}
    </section>
  );
}

function SprintCard({ sprint }: { sprint: Sprint }) {
  const { workspace } = useWorkspace();
  const feedback = useTaskFeedback();
  const editor = useTaskEditor();
  const progress = getSprintProgress(workspace.tasks, sprint.id);
  const preview = getManualOrder(workspace.tasks, sprint.id).slice(0, 3);
  const style = SPRINT_STYLES[sprint.id];
  const Icon = SPRINT_ICONS[sprint.id];
  const href = `/sprints#${sprint.id}`;

  return (
    <Card className={cn("group overflow-hidden border-t-[3px] p-5", style.border)}>
      <div className="flex items-start justify-between gap-3">
        <Link href={href} className="flex min-w-0 items-start gap-2.5 rounded-md focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none">
          <span className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md", style.tint)}>
            <Icon className={cn("size-3.5", style.text)} />
          </span>
          <span className="min-w-0">
            <span className={cn("block text-[11px] font-bold tracking-[0.08em] uppercase", style.text)}>Sprint {sprint.number}</span>
            <span className="block text-[15px] font-semibold tracking-tight group-hover:text-primary">{sprint.name}</span>
          </span>
        </Link>
        <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
          {progress.active} active
        </span>
      </div>

      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarClock className="size-3.5" />
        {progress.nextDeadline ? (
          <>
            Next deadline: <span className="font-semibold">{relativeDayPhrase(progress.nextDeadline, workspace.today)}</span>
          </>
        ) : (
          "No deadlines"
        )}
      </p>

      <ul className="mt-3 flex flex-1 flex-col">
        {preview.length === 0 && (
          <li className="flex items-center justify-between gap-2 py-2 text-[13px] text-muted-foreground">
            All clear here.
            <button
              type="button"
              onClick={() => editor.openCreate({ sprint: sprint.id })}
              className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover"
            >
              <Plus className="size-3.5" />
              Add task
            </button>
          </li>
        )}
        {preview.map((task) => (
          <li key={task.id} className="flex items-start gap-2.5 py-1.5">
            <Checkbox
              checked={false}
              onCheckedChange={() => feedback.toggleComplete(task)}
              aria-label={`Complete “${task.title}”`}
              className="mt-px size-4 rounded-[4px]"
            />
            <button
              type="button"
              onClick={() => editor.openEdit(task.id)}
              className="line-clamp-1 cursor-pointer text-left text-[13px] leading-snug hover:text-primary"
            >
              {task.title}
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-center gap-3">
        {progress.percent === null ? (
          <span className="text-[11px] text-subtle-foreground">No tasks yet</span>
        ) : (
          <>
            <Progress
              value={progress.percent}
              className="flex-1"
              indicatorClassName={style.bar}
              aria-label={`${sprint.name}: ${progress.completed} of ${progress.total} complete`}
            />
            <span className="text-[11px] font-medium whitespace-nowrap text-muted-foreground tabular-nums">
              {progress.completed}/{progress.total} done
            </span>
          </>
        )}
      </div>
      <Link
        href={href}
        className="mt-3 inline-flex items-center gap-1 self-start text-xs font-semibold text-primary hover:text-primary-hover"
      >
        View sprint
        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </Card>
  );
}
