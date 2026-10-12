"use client";

import { MoreHorizontal, Star } from "lucide-react";

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
import type { Task, TaskStatus } from "@/types";

import { SprintDot } from "./sprint-badge";
import { StatusBadge } from "./task-meta";

const STATUSES: TaskStatus[] = ["todo", "in_progress", "done"];

export function TaskActionsMenu({ task }: { task: Task }) {
  const { workspace, actions } = useWorkspace();
  const isHighlight = workspace.highlightTaskId === task.id;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-xs" aria-label={`Actions for “${task.title}”`}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {task.status !== "done" && (
          <DropdownMenuItem onSelect={() => actions.setHighlight(isHighlight ? null : task.id)}>
            <Star className={isHighlight ? "fill-amber-400 text-amber-400" : undefined} />
            {isHighlight ? "Remove as highlight" : "Make today’s highlight"}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">Status</DropdownMenuLabel>
        {STATUSES.map((s) => (
          <DropdownMenuItem key={s} disabled={task.status === s} onSelect={() => actions.setTaskStatus(task.id, s)}>
            <StatusBadge status={s} />
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">Move to sprint</DropdownMenuLabel>
        {SPRINTS.map((s) => (
          <DropdownMenuItem key={s.id} disabled={task.sprintId === s.id} onSelect={() => actions.moveTask(task.id, s.id)}>
            <SprintDot sprintId={s.id} className="ml-1" />
            Sprint {s.number}: {s.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
