"use client";

import Link from "next/link";
import { Plus, Shuffle } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { DueLabel, EstimateLabel, StatusBadge } from "@/components/shared/task-meta";
import { PriorityIndicator } from "@/components/tasks/priority-indicator";
import { TaskActionsMenu } from "@/components/tasks/task-actions-menu";
import { useTaskEditor } from "@/components/tasks/task-editor-provider";
import { useTaskFeedback } from "@/components/tasks/use-task-feedback";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SPRINTS, SPRINT_STYLES } from "@/data/sprints";
import { getProject } from "@/lib/selectors";
import { useWorkspace } from "@/lib/store/workspace-store";
import { isActive } from "@/lib/tasks/task-model";
import { getSprintStats } from "@/lib/tasks/task-queries";
import { cn, formatMinutes } from "@/lib/utils";
import type { Sprint, Task } from "@/types";

export function SprintsPage() {
  const { workspace } = useWorkspace();
  const unassigned = workspace.tasks.filter((t) => t.sprint === null && isActive(t)).length;

  return (
    <>
      <PageHeader
        title="Sprints"
        description="Four kinds of work, side by side. They’re not a queue — start wherever your energy is today."
      />
      <div className="mb-5 flex flex-col gap-2 rounded-xl border border-dashed bg-card/60 px-4 py-3 text-[13px] text-muted-foreground sm:flex-row sm:items-center">
        <Shuffle className="size-4 shrink-0 text-primary" />
        <span className="flex-1">
          Low energy? Try Admin & Life. Fresh mind? Build & Create. Use the ⋯ menu to move a task to another sprint.
        </span>
        {unassigned > 0 && (
          <Link href="/tasks" className="shrink-0 text-xs font-semibold text-primary hover:text-primary-hover">
            {unassigned} without a sprint →
          </Link>
        )}
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
  const editor = useTaskEditor();
  const { open, doneToday } = getSprintStats(workspace.tasks, sprint.id, workspace.today);
  const style = SPRINT_STYLES[sprint.id];
  const totalMinutes = open.reduce((sum, t) => sum + (t.estimatedMinutes ?? 0), 0);

  return (
    <section
      id={sprint.id}
      className="flex scroll-mt-24 flex-col rounded-xl border bg-muted/40"
      aria-labelledby={`${sprint.id}-title`}
    >
      <header className={cn("rounded-t-xl border-t-[3px] bg-card px-4 pt-4 pb-3.5", style.border)}>
        <div className="flex items-center justify-between gap-2">
          <p className={cn("text-[11px] font-bold tracking-[0.08em] uppercase", style.text)}>Sprint {sprint.number}</p>
          <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
            {open.length} open{totalMinutes ? ` · ${formatMinutes(totalMinutes)}` : ""}
          </span>
        </div>
        <h3 id={`${sprint.id}-title`} className="mt-0.5 text-base font-semibold tracking-tight">
          {sprint.name}
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{sprint.energyHint}</p>
      </header>

      <div className="flex flex-1 flex-col gap-2 p-3">
        {open.map((t) => (
          <SprintTaskCard key={t.id} task={t} />
        ))}
        {open.length === 0 && <p className="px-2 py-5 text-center text-[13px] text-muted-foreground">Nothing open here.</p>}
        <Button
          variant="ghost"
          size="sm"
          className="justify-start gap-1.5"
          onClick={() => editor.openCreate({ sprint: sprint.id })}
        >
          <Plus className="size-4" />
          Add task
        </Button>
        {doneToday.length > 0 && (
          <>
            <p className="mt-2 px-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Done today
            </p>
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
  const { workspace } = useWorkspace();
  const feedback = useTaskFeedback();
  const editor = useTaskEditor();
  const project = getProject(workspace, task.projectId);
  const done = task.status === "completed";

  return (
    <article
      className={cn(
        "group flex items-start gap-3 rounded-lg border bg-card p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-slate-300",
        done && "bg-card/60",
      )}
    >
      <Checkbox
        checked={done}
        onCheckedChange={() => feedback.toggleComplete(task)}
        aria-label={done ? `Reopen “${task.title}”` : `Complete “${task.title}”`}
        className="mt-px"
      />
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => editor.openEdit(task.id)}
          className={cn(
            "block cursor-pointer text-left text-[13px] leading-snug font-medium hover:text-primary",
            done && "text-muted-foreground line-through decoration-slate-300",
          )}
        >
          {task.title}
        </button>
        {project && <p className="mt-1 truncate text-xs text-muted-foreground">{project.name}</p>}
        {!done && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            {task.status === "in_progress" && <StatusBadge status="in_progress" />}
            {task.priority && <PriorityIndicator priority={task.priority} />}
            <EstimateLabel minutes={task.estimatedMinutes} />
            <DueLabel due={task.dueDate} today={workspace.today} />
          </div>
        )}
      </div>
      <div className="transition-opacity lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100">
        <TaskActionsMenu task={task} />
      </div>
    </article>
  );
}
