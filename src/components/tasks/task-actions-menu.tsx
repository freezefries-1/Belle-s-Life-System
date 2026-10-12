"use client";

import { CircleDashed, CirclePlay, MoreHorizontal, Pencil, SkipForward, Trash2, Undo2 } from "lucide-react";

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

export function TaskActionsMenu({ task, align = "end" }: { task: Task; align?: "start" | "end" }) {
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
        <DropdownMenuLabel className="text-xs text-muted-foreground">Sprint</DropdownMenuLabel>
        {SPRINTS.map((s) => (
          <DropdownMenuItem
            key={s.id}
            disabled={task.sprint === s.id}
            onSelect={() => actions.updateTask(task.id, { sprint: s.id })}
          >
            <SprintDot sprintId={s.id} className="ml-1" />
            Sprint {s.number}: {s.name}
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem disabled={task.sprint === null} onSelect={() => actions.updateTask(task.id, { sprint: null })}>
          <span className="ml-1 size-2 rounded-full border border-dashed border-slate-400" />
          No sprint
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => feedback.remove(task)} className="text-rose-600 focus:text-rose-700">
          <Trash2 className="text-rose-500" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
