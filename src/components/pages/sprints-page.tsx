"use client";

import { Shuffle } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { DueLabel, EstimateLabel } from "@/components/shared/task-meta";
import { TaskActionsMenu } from "@/components/shared/task-actions-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { SPRINTS, SPRINT_STYLES } from "@/data/sprints";
import { getProject, getSprintStats, sortTasksForDisplay } from "@/lib/selectors";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn, formatMinutes } from "@/lib/utils";
import type { Sprint, Task } from "@/types";

export function SprintsPage() {
  return (
    <>
      <PageHeader
        title="Sprints"
        description="Four kinds of work, side by side. They’re not a queue — start wherever your energy is today."
      />
      <div className="mb-5 flex items-center gap-2 rounded-xl border border-dashed bg-card/60 px-4 py-3 text-[13px] text-muted-foreground">
        <Shuffle className="size-4 shrink-0 text-primary" />
        Low energy? Try Admin & Life. Fresh mind? Build & Create. Use the ⋯ menu to move a task between sprints.
      </div>
      <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
        {SPRINTS.map((s) => (
          <SprintColumn key={s.id} sprint={s} />
        ))}
      </div>
    </>
  );
}

function SprintColumn({ sprint }: { sprint: Sprint }) {
  const { workspace } = useWorkspace();
  const { open, doneToday } = getSprintStats(workspace, sprint.id);
  const style = SPRINT_STYLES[sprint.id];
  const totalMinutes = open.reduce((sum, t) => sum + (t.estimateMinutes ?? 0), 0);

  return (
    <section id={sprint.id} className="flex scroll-mt-24 flex-col rounded-xl border bg-muted/40" aria-labelledby={`${sprint.id}-title`}>
      <header className={cn("rounded-t-xl border-t-[3px] bg-card px-4 pt-4 pb-3.5", style.border)}>
        <div className="flex items-center justify-between gap-2">
          <p className={cn("text-[11px] font-bold tracking-[0.08em] uppercase", style.text)}>Sprint {sprint.number}</p>
          <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
            {open.length} open · {formatMinutes(totalMinutes)}
          </span>
        </div>
        <h3 id={`${sprint.id}-title`} className="mt-0.5 text-base font-semibold tracking-tight">
          {sprint.name}
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{sprint.energyHint}</p>
      </header>

      <div className="flex flex-1 flex-col gap-2 p-3">
        {sortTasksForDisplay(open).map((t) => (
          <SprintTaskCard key={t.id} task={t} />
        ))}
        {open.length === 0 && <p className="px-2 py-6 text-center text-[13px] text-muted-foreground">Nothing open here.</p>}
        {doneToday.length > 0 && (
          <>
            <p className="mt-2 px-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Done today</p>
            {doneToday.map((t) => (
              <SprintTaskCard key={t.id} task={t} />
            ))}
          </>
        )}
      </div>
    </section>
  );
}

function SprintTaskCard({ task }: { task: Task }) {
  const { workspace, actions } = useWorkspace();
  const project = getProject(workspace, task.projectId);
  const done = task.status === "done";

  return (
    <article
      className={cn(
        "group flex items-start gap-3 rounded-lg border bg-card p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-slate-300",
        done && "bg-card/60",
      )}
    >
      <Checkbox
        checked={done}
        onCheckedChange={() => actions.toggleTask(task.id)}
        aria-label={`Toggle “${task.title}”`}
        className="mt-px"
      />
      <div className="min-w-0 flex-1">
        <p className={cn("text-[13px] leading-snug font-medium", done && "text-muted-foreground line-through decoration-slate-300")}>
          {task.title}
        </p>
        {project && <p className="mt-1 truncate text-xs text-muted-foreground">{project.name}</p>}
        {!done && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            {task.status === "in_progress" && (
              <span className="rounded bg-accent px-1.5 py-px text-[11px] font-semibold text-accent-foreground">In progress</span>
            )}
            <EstimateLabel minutes={task.estimateMinutes} />
            <DueLabel due={task.dueDate} today={workspace.today} />
          </div>
        )}
      </div>
      <div className="opacity-100 transition-opacity lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100">
        <TaskActionsMenu task={task} />
      </div>
    </article>
  );
}
