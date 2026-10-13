"use client";

import { toast } from "sonner";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SPRINTS, SPRINT_STYLES, sprintLabel } from "@/data/sprints";
import { useWorkspaceActions } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";

/** One-tap sprint assignment: four small numbered buttons. */
export function SprintQuickAssign({ task, className }: { task: Task; className?: string }) {
  const actions = useWorkspaceActions();

  return (
    <div className={cn("mt-2 flex items-center gap-1", className)} role="group" aria-label={`Assign “${task.title}” to a sprint`}>
      <span className="mr-0.5 text-[11px] font-medium text-muted-foreground">Assign:</span>
      {SPRINTS.map((s) => (
        <Tooltip key={s.id}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => {
                actions.moveTaskToSprint(task.id, s.id);
                toast(`Moved to ${sprintLabel(s.id)}`, {
                  description: task.title,
                  action: { label: "Undo", onClick: () => actions.moveTaskToSprint(task.id, null) },
                });
              }}
              aria-label={`Move to ${sprintLabel(s.id)}`}
              className="flex h-6 min-w-6 cursor-pointer items-center justify-center gap-1 rounded-md border bg-card px-1.5 text-[11px] font-bold text-muted-foreground transition-colors hover:border-slate-300 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span className={cn("size-1.5 rounded-full", SPRINT_STYLES[s.id].dot)} />
              {s.number}
            </button>
          </TooltipTrigger>
          <TooltipContent>{sprintLabel(s.id)}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
