"use client";

import { Pencil } from "lucide-react";

import { SprintBadge } from "@/components/shared/sprint-badge";
import { DueLabel, EstimateLabel, StatusBadge } from "@/components/shared/task-meta";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { getProject } from "@/lib/selectors";
import { useWorkspace } from "@/lib/store/workspace-store";
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
  className,
}: {
  task: Task;
  showSprint?: boolean;
  showProject?: boolean;
  showDescription?: boolean;
  className?: string;
}) {
  const { workspace } = useWorkspace();
  const editor = useTaskEditor();
  const feedback = useTaskFeedback();
  const project = showProject ? getProject(workspace, task.projectId) : null;
  const done = task.status === "completed";
  const skipped = task.status === "skipped";
  const overdue = isOverdue(task, workspace.today);

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
        <TaskActionsMenu task={task} />
      </div>
    </div>
  );
}
