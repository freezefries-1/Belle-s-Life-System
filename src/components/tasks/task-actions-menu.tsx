"use client";

import { CircleDashed, CirclePlay, MoreHorizontal, Pencil, Repeat, SkipForward, Trash2, Undo2, Unlink } from "lucide-react";
import { toast } from "sonner";

import { SprintDot } from "@/components/shared/sprint-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SPRINTS } from "@/data/sprints";
import { useWorkspace } from "@/lib/store/workspace-store";
import type { Task } from "@/types";

import { useTaskEditor } from "./task-editor-provider";
import { useTaskFeedback } from "./use-task-feedback";

export function TaskActionsMenu({ task, align = "end", projectId }: { task: Task; align?: "start" | "end"; projectId?: string }) {
  const { actions } = useWorkspace();
  const editor = useTaskEditor();
  const feedback = useTaskFeedback();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-xs" aria-label={`More actions for “${task.title}”`}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56">
        <DropdownMenuItem onSelect={() => editor.openEdit(task.id)}>
          <Pencil />
          Edit
        </DropdownMenuItem>
        {task.recurrenceTemplateId && (
          <DropdownMenuItem onSelect={() => editor.openSeries(task.recurrenceTemplateId!)}>
            <Repeat />
            Edit future occurrences
          </DropdownMenuItem>
        )}
        {task.status === "todo" && (
          <DropdownMenuItem onSelect={() => feedback.setStatus(task, "in_progress")}>
            <CirclePlay />
            Start (In Progress)
          </DropdownMenuItem>
        )}
        {task.status === "in_progress" && (
          <DropdownMenuItem onSelect={() => feedback.setStatus(task, "todo")}>
            <CircleDashed />
            Back to To Do
          </DropdownMenuItem>
        )}
        {task.status === "skipped" || task.status === "completed" ? (
          <DropdownMenuItem onSelect={() => feedback.setStatus(task, "todo")}>
            <Undo2 />
            Reopen
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => feedback.setStatus(task, "skipped")}>
            <SkipForward />
            Skip
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">Move to sprint</DropdownMenuLabel>
        {SPRINTS.map((s) => (
          <DropdownMenuItem
            key={s.id}
            disabled={task.sprint === s.id}
            onSelect={() => actions.moveTaskToSprint(task.id, s.id)}
          >
            <SprintDot sprintId={s.id} className="ml-1" />
            Sprint {s.number}: {s.name}
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem disabled={task.sprint === null} onSelect={() => actions.moveTaskToSprint(task.id, null)}>
          <span className="ml-1 size-2 rounded-full border border-dashed border-slate-400" />
          Unassigned
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        {projectId && task.projectId === projectId && (
          <DropdownMenuItem
            onSelect={() => {
              actions.linkTaskToProject(task.id, null);
              toast("Removed from project — the task is kept", {
                description: task.title,
                action: { label: "Undo", onClick: () => actions.linkTaskToProject(task.id, projectId) },
              });
            }}
          >
            <Unlink />
            Remove from project
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => feedback.remove(task)} className="text-rose-600 focus:text-rose-700">
          <Trash2 className="text-rose-500" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
