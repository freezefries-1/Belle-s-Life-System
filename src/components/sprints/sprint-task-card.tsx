"use client";

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FolderOpen, GripVertical } from "lucide-react";

import { DueLabel, EstimateLabel, StatusBadge } from "@/components/shared/task-meta";
import { PriorityIndicator } from "@/components/tasks/priority-indicator";
import { TaskActionsMenu } from "@/components/tasks/task-actions-menu";
import { useTaskEditor } from "@/components/tasks/task-editor-provider";
import { useTaskFeedback } from "@/components/tasks/use-task-feedback";
import { Checkbox } from "@/components/ui/checkbox";
import { getProject } from "@/lib/selectors";
import { useWorkspace } from "@/lib/store/workspace-store";
import { isOverdue } from "@/lib/tasks/task-queries";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";

type HandleProps = React.HTMLAttributes<HTMLButtonElement> & { ref?: (el: HTMLElement | null) => void };

/** A task on the Sprints board. Click the title to edit; drag from the grip. */
export function SprintTaskCard({
  task,
  handle,
  dragging = false,
  overlay = false,
  footer,
}: {
  task: Task;
  /** Present only when manual reordering is allowed. */
  handle?: HandleProps;
  dragging?: boolean;
  overlay?: boolean;
  footer?: React.ReactNode;
}) {
  const { workspace } = useWorkspace();
  const feedback = useTaskFeedback();
  const editor = useTaskEditor();
  const project = getProject(workspace, task.projectId);
  const done = task.status === "completed";
  const overdue = isOverdue(task, workspace.today);

  return (
    <article
      className={cn(
        "group relative flex items-start gap-2 rounded-lg border bg-card py-2.5 pr-2 pl-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[border-color,box-shadow,opacity]",
        !overlay && "hover:border-slate-300",
        overdue && "border-l-[3px] border-l-rose-300",
        dragging && "border-dashed border-primary/50 bg-accent/40 opacity-60 shadow-none",
        overlay && "rotate-[0.6deg] cursor-grabbing border-primary/40 shadow-xl ring-1 ring-primary/20",
        done && "bg-card/60",
      )}
    >
      {handle ? (
        <button
          type="button"
          {...handle}
          aria-label={`Drag to reorder “${task.title}”. Press space to pick up, arrow keys to move.`}
          className="-ml-1 flex h-6 w-5 shrink-0 cursor-grab touch-none items-center justify-center rounded text-subtle-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>
      ) : (
        <span className="w-1" aria-hidden />
      )}

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
            "block max-w-full cursor-pointer rounded text-left text-[13px] leading-snug font-medium hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
            (done || task.status === "skipped") && "text-muted-foreground line-through decoration-slate-300",
          )}
        >
          {task.title}
        </button>
        {!done && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            {task.status !== "todo" && <StatusBadge status={task.status} />}
            {task.priority && <PriorityIndicator priority={task.priority} />}
            <DueLabel due={task.dueDate} today={workspace.today} />
            <EstimateLabel minutes={task.estimatedMinutes} />
          </div>
        )}
        {project && (
          <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
            <FolderOpen className="size-3 shrink-0" />
            <span className="truncate">{project.name}</span>
          </p>
        )}
        {footer}
      </div>

      {!overlay && (
        <div className="-mt-0.5 text-subtle-foreground">
          <TaskActionsMenu task={task} />
        </div>
      )}
    </article>
  );
}

export function SortableTaskCard({ task, footer }: { task: Task; footer?: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "task" },
  });

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <SprintTaskCard
        task={task}
        dragging={isDragging}
        footer={footer}
        handle={{ ...attributes, ...listeners, ref: setActivatorNodeRef }}
      />
    </div>
  );
}
