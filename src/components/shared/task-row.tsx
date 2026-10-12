"use client";

import { Star } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { getProject, isCarriedOver } from "@/lib/selectors";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";

import { SprintBadge } from "./sprint-badge";
import { CarriedOverLabel, DueLabel, EstimateLabel } from "./task-meta";

/** Compact, reusable task row with completion toggle and quiet metadata. */
export function TaskRow({
  task,
  showSprint = true,
  showProject = true,
  dense = false,
  className,
}: {
  task: Task;
  showSprint?: boolean;
  showProject?: boolean;
  dense?: boolean;
  className?: string;
}) {
  const { workspace, actions } = useWorkspace();
  const project = getProject(workspace, task.projectId);
  const done = task.status === "done";
  const isHighlight = workspace.highlightTaskId === task.id;
  const carried = isCarriedOver(task, workspace.today);

  return (
    <div
      className={cn(
        "group flex items-start gap-3 rounded-lg px-2 transition-colors hover:bg-muted/60",
        dense ? "py-1.5" : "py-2",
        className,
      )}
    >
      <Checkbox
        checked={done}
        onCheckedChange={() => actions.toggleTask(task.id)}
        aria-label={done ? `Mark “${task.title}” as not done` : `Mark “${task.title}” as done`}
        className="mt-[3px]"
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "flex items-center gap-1.5 text-[13.5px] leading-snug font-medium",
            done && "text-muted-foreground line-through decoration-slate-300",
          )}
        >
          {isHighlight && <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" aria-label="Today’s highlight" />}
          <span className="min-w-0">{task.title}</span>
        </p>
        {!dense && (
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            {showSprint && <SprintBadge sprintId={task.sprintId} />}
            {showProject && project && <span className="truncate text-xs text-muted-foreground">{project.name}</span>}
            <EstimateLabel minutes={task.estimateMinutes} />
            {!done && <DueLabel due={task.dueDate} today={workspace.today} />}
            {carried && <CarriedOverLabel />}
          </div>
        )}
      </div>
    </div>
  );
}
