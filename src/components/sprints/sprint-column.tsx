"use client";

import Link from "next/link";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, Timer } from "lucide-react";

import { useTaskEditor } from "@/components/tasks/task-editor-provider";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SPRINT_ICONS, SPRINT_STYLES } from "@/data/sprints";
import { relativeDayPhrase } from "@/lib/date";
import { useWorkspace } from "@/lib/store/workspace-store";
import { getSprintProgress } from "@/lib/tasks/sprint-board";
import { cn, formatMinutes } from "@/lib/utils";
import type { Sprint, Task } from "@/types";

import { useSessionPlanner } from "./session-planner-provider";
import { SortableTaskCard, SprintTaskCard } from "./sprint-task-card";

export function SprintColumn({
  sprint,
  tasks,
  reorderable,
  filtered,
}: {
  sprint: Sprint;
  /** Cards to show, already filtered and ordered. */
  tasks: Task[];
  reorderable: boolean;
  filtered: boolean;
}) {
  const { workspace } = useWorkspace();
  const editor = useTaskEditor();
  const planner = useSessionPlanner();
  const { setNodeRef, isOver } = useDroppable({ id: sprint.id, data: { type: "container" } });
  const progress = getSprintProgress(workspace.tasks, sprint.id);
  const style = SPRINT_STYLES[sprint.id];
  const Icon = SPRINT_ICONS[sprint.id];
  const completed = workspace.tasks
    .filter((t) => t.sprint === sprint.id && t.status === "completed")
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));

  return (
    <section
      id={sprint.id}
      aria-labelledby={`${sprint.id}-title`}
      className={cn(
        "flex scroll-mt-24 flex-col rounded-xl border bg-muted/40 transition-colors",
        isOver && reorderable && "border-primary/40 bg-accent/40",
      )}
    >
      <header className={cn("rounded-t-xl border-t-[3px] bg-card px-4 pt-4 pb-3.5", style.border)}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", style.tint)}>
              <Icon className={cn("size-4", style.text)} />
            </span>
            <div className="min-w-0">
              <p className={cn("text-[11px] font-bold tracking-[0.08em] uppercase", style.text)}>Sprint {sprint.number}</p>
              <h3 id={`${sprint.id}-title`} className="text-base leading-tight font-semibold tracking-tight">
                {sprint.name}
              </h3>
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => planner.open({ sprintId: sprint.id })}
                aria-label={`Plan a ${sprint.name} session`}
              >
                <Timer className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Plan a session</TooltipContent>
          </Tooltip>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{sprint.description}</p>

        <div className="mt-3 flex items-center justify-between text-[11px] font-medium text-muted-foreground tabular-nums">
          <span>
            <span className="font-bold text-foreground">{progress.active}</span> active ·{" "}
            <span className="font-bold text-foreground">{progress.completed}</span> done
          </span>
          {progress.remainingMinutes > 0 && <span>≈ {formatMinutes(progress.remainingMinutes)} left</span>}
        </div>
        {progress.percent === null ? (
          <p className="mt-2 text-[11px] text-subtle-foreground">No tasks yet</p>
        ) : (
          <div className="mt-2 flex items-center gap-2">
            <Progress value={progress.percent} indicatorClassName={style.bar} aria-label={`${sprint.name} ${progress.percent}% complete`} />
            <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">{progress.percent}%</span>
          </div>
        )}
        {progress.nextDeadline && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Next deadline: <span className="font-semibold">{relativeDayPhrase(progress.nextDeadline, workspace.today)}</span>
          </p>
        )}
      </header>

      <div ref={setNodeRef} className="flex min-h-24 flex-1 flex-col gap-2 p-2.5">
        {reorderable ? (
          <SortableContext id={sprint.id} items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            {tasks.map((t) => (
              <SortableTaskCard key={t.id} task={t} />
            ))}
          </SortableContext>
        ) : (
          tasks.map((t) => <SprintTaskCard key={t.id} task={t} />)
        )}

        {tasks.length === 0 && (
          <p
            className={cn(
              "rounded-lg border border-dashed px-3 py-5 text-center text-[13px] text-muted-foreground",
              isOver && "border-primary/40 text-primary",
            )}
          >
            {filtered ? "Nothing matches these filters." : "Nothing open here."}
          </p>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="justify-start gap-1.5 text-muted-foreground"
          onClick={() => editor.openCreate({ sprint: sprint.id })}
        >
          <Plus className="size-4" />
          Add task
        </Button>

        {completed.length > 0 && (
          <details className="group/done rounded-lg">
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-md px-2 py-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase hover:bg-card hover:text-foreground">
              Completed ({completed.length})
              <span className="text-[10px] normal-case group-open/done:hidden">Show</span>
              <span className="hidden text-[10px] normal-case group-open/done:inline">Hide</span>
            </summary>
            <div className="mt-1.5 flex flex-col gap-1.5">
              {completed.slice(0, 20).map((t) => (
                <SprintTaskCard key={t.id} task={t} />
              ))}
              {completed.length > 20 && (
                <Link href="/tasks" className="px-2 text-xs font-semibold text-primary hover:text-primary-hover">
                  See all in Tasks
                </Link>
              )}
            </div>
          </details>
        )}
      </div>
    </section>
  );
}
