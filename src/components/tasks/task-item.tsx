"use client";

import { Flag, Pencil, Repeat } from "lucide-react";

import { SprintBadge } from "@/components/shared/sprint-badge";
import { DueLabel, EstimateLabel, StatusBadge } from "@/components/shared/task-meta";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { getProject } from "@/lib/selectors";
import { useWorkspace } from "@/lib/store/workspace-store";
import { describeRule } from "@/lib/recurrence/recurrence";
import { isOverdue } from "@/lib/tasks/task-queries";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";

import { PriorityIndicator } from "./priority-indicator";
import { TaskActionsMenu } from "./task-actions-menu";
import { useTaskEditor } from "./task-editor-provider";
import { useTaskFeedback } from "./use-task-feedback";

/**
 * The one task row used across the app: completion checkbox, title,
 * sprint, due date, priority, estimate and an edit action.
 */
export function TaskItem({
  task,
  showSprint = true,
  showProject = false,
  showDescription = true,
  projectId,
  className,
}: {
  task: Task;
  showSprint?: boolean;
  showProject?: boolean;
  showDescription?: boolean;
  /** Shown inside a project's workspace — enables "Remove from project". */
  projectId?: string;
  className?: string;
}) {
  const { workspace } = useWorkspace();
  const editor = useTaskEditor();
  const feedback = useTaskFeedback();
  const project = showProject ? getProject(workspace, task.projectId) : null;
  const done = task.status === "completed";
  const skipped = task.status === "skipped";
  const overdue = isOverdue(task, workspace.today);
  const milestone = task.milestoneId ? workspace.milestones.find((m) => m.id === task.milestoneId) : undefined;
  const template = task.recurrenceTemplateId ? workspace.recurrences.find((r) => r.id === task.recurrenceTemplateId) : undefined;

  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 rounded-lg px-2.5 py-2.5 transition-colors hover:bg-muted/60",
        overdue && "before:absolute before:top-3 before:bottom-3 before:left-0 before:w-[2px] before:rounded-full before:bg-rose-300",
        className,
      )}
    >
      <Checkbox
        checked={done}
        onCheckedChange={() => feedback.toggleComplete(task)}
        aria-label={done ? `Reopen “${task.title}”` : `Complete “${task.title}”`}
        className="mt-[3px]"
      />

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => editor.openEdit(task.id)}
          className={cn(
            "block max-w-full cursor-pointer rounded text-left text-[13.5px] leading-snug font-medium hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
            (done || skipped) && "text-muted-foreground line-through decoration-slate-300",
          )}
        >
          {task.title}
        </button>
        {showDescription && task.description && (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{task.description}</p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          {(task.status === "in_progress" || skipped) && <StatusBadge status={task.status} />}
          {showSprint && <SprintBadge sprintId={task.sprint} />}
          <DueLabel due={task.dueDate} today={workspace.today} done={done || skipped} />
          {task.priority && <PriorityIndicator priority={task.priority} showLabel />}
          <EstimateLabel minutes={task.estimatedMinutes} />
          {template && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title={describeRule(template)}>
              <Repeat className="size-3" />
              Repeats
            </span>
          )}
          {milestone && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Flag className="size-3" />
              {milestone.title}
            </span>
          )}
          {project && <span className="truncate text-xs text-muted-foreground">{project.name}</span>}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 text-subtle-foreground">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => editor.openEdit(task.id)}
          aria-label={`Edit “${task.title}”`}
        >
          <Pencil className="size-3.5" />
        </Button>
        <TaskActionsMenu task={task} projectId={projectId} />
      </div>
    </div>
  );
}
