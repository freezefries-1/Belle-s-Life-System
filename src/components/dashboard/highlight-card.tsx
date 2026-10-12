"use client";

import * as React from "react";
import { ArrowRight, Check, Clock, FolderOpen, History, MoreHorizontal, Pencil, Repeat, Star, Timer, X } from "lucide-react";
import { toast } from "sonner";

import { HighlightPickerDialog } from "@/components/daily/highlight-picker-dialog";
import { SprintBadge } from "@/components/shared/sprint-badge";
import { useSessionPlanner } from "@/components/sprints/session-planner-provider";
import { useTaskEditor } from "@/components/tasks/task-editor-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getUnfinishedYesterday, resolveHighlight } from "@/lib/daily/day";
import { getProject } from "@/lib/selectors";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn, formatMinutes } from "@/lib/utils";

/**
 * Today's one priority. Linked to a real task — ticking it here completes
 * that task everywhere, and its status is always read from the task.
 */
export function HighlightCard({ className }: { className?: string }) {
  const { workspace, actions } = useWorkspace();
  const editor = useTaskEditor();
  const planner = useSessionPlanner();
  const [picking, setPicking] = React.useState(false);
  const resolved = resolveHighlight(workspace, workspace.today);
  const task = resolved?.task ?? null;
  const project = task ? getProject(workspace, task.projectId) : null;
  const done = resolved?.completed ?? false;
  const yesterday = resolved ? null : getUnfinishedYesterday(workspace, workspace.today);

  function toggleDone() {
    if (!task) return;
    const updated = actions.toggleTaskComplete(task.id);
    if (updated?.status === "completed") toast("Highlight complete. One small step completed.", { description: task.title });
    else toast("Highlight reopened", { description: task.title });
  }

  return (
    <section
      aria-labelledby="highlight-heading"
      className={cn(
        "relative flex flex-col overflow-hidden rounded-xl border border-ink-border/60 bg-ink p-5 text-ink-foreground shadow-[0_8px_24px_-12px_rgba(16,24,39,0.5)] sm:p-6",
        className,
      )}
    >
      <span className="absolute inset-x-0 top-0 h-[3px] bg-primary" aria-hidden />

      <div className="flex items-center justify-between gap-3">
        <p
          id="highlight-heading"
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] text-ink-muted uppercase"
        >
          <Star className={cn("size-3.5 text-amber-400", (done || !resolved) && "fill-amber-400")} />
          Today’s highlight
        </p>
        {resolved && (
          <div className="flex items-center gap-1">
            <Button variant="ink-ghost" size="xs" onClick={() => setPicking(true)} className="gap-1.5">
              <Repeat className="size-3.5" />
              Change
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ink-ghost" size="icon-xs" aria-label="More highlight actions">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {task && (
                  <DropdownMenuItem onSelect={() => editor.openEdit(task.id)}>
                    <Pencil />
                    Edit task
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => setPicking(true)}>
                  <Repeat />
                  Change highlight
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    actions.removeHighlight();
                    toast("Highlight removed — the task itself is unchanged.");
                  }}
                >
                  <X />
                  Remove highlight
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {!resolved ? (
        <div className="mt-4 flex flex-1 flex-col items-start justify-center gap-2 py-4">
          <h3 className="text-[21px] leading-snug font-semibold tracking-tight sm:text-[23px]">What’s your one priority today?</h3>
          <p className="text-[13px] text-ink-muted">Choose one thing that would make today feel productive.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button onClick={() => setPicking(true)} className="gap-1.5">
              <Star className="size-4" />
              Select Highlight
            </Button>
            {yesterday && (
              <Button
                variant="ink"
                onClick={() => {
                  actions.setHighlight(yesterday.id);
                  toast("Today’s highlight is set", { description: yesterday.title });
                }}
                className="max-w-full gap-1.5"
              >
                <History className="size-4 shrink-0" />
                <span className="truncate">Continue: {yesterday.title}</span>
              </Button>
            )}
          </div>
        </div>
      ) : resolved.deleted ? (
        <div className="mt-4 flex flex-1 flex-col gap-2">
          <h3 className="text-[21px] leading-snug font-semibold tracking-tight text-ink-muted line-through decoration-ink-border">
            {resolved.title}
          </h3>
          <p className="text-[13px] text-ink-muted">This task was deleted. Choose another highlight whenever you’re ready.</p>
          <Button onClick={() => setPicking(true)} className="mt-2 self-start">
            Choose another
          </Button>
        </div>
      ) : (
        task && (
          <div className="mt-4 flex flex-1 flex-col">
            <div className="flex items-start gap-3.5">
              <Checkbox
                checked={done}
                onCheckedChange={toggleDone}
                aria-label={done ? "Reopen highlight" : "Complete highlight"}
                className="mt-1.5 size-6 rounded-md border-ink-border bg-ink-2 hover:border-primary-hover data-[state=checked]:border-primary"
              />
              <div className="min-w-0">
                <h3
                  className={cn(
                    "text-[21px] leading-snug font-semibold tracking-tight sm:text-[23px]",
                    done && "text-ink-muted line-through decoration-ink-border",
                  )}
                >
                  {task.title}
                </h3>
                {task.description && <p className="mt-1 line-clamp-2 text-[13px] text-ink-muted">{task.description}</p>}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 pl-[38px] text-[13px] text-ink-muted">
              <SprintBadge sprintId={task.sprint} variant="ink" className="text-[13px]" />
              {project && (
                <span className="inline-flex items-center gap-1.5">
                  <FolderOpen className="size-3.5" />
                  {project.name}
                </span>
              )}
              {task.estimatedMinutes != null && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  {formatMinutes(task.estimatedMinutes)}
                </span>
              )}
              {task.status === "in_progress" && (
                <span className="rounded border border-ink-border px-1.5 text-[11px] font-semibold">In progress</span>
              )}
            </div>

            <div className="mt-auto pt-6">
              {done ? (
                <p className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-[13px] font-semibold text-emerald-300">
                  <Check className="size-4" />
                  Highlight done. Everything else today is a bonus.
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={toggleDone} className="gap-1.5">
                    <Check className="size-4" />
                    Mark complete
                  </Button>
                  {task.sprint && (
                    <Button
                      variant="ink"
                      onClick={() => planner.open({ sprintId: task.sprint!, taskIds: [task.id] })}
                      className="gap-1.5"
                    >
                      <Timer className="size-4" />
                      Plan a focus session
                    </Button>
                  )}
                  <Button variant="ink-ghost" onClick={() => editor.openEdit(task.id)} className="gap-1.5">
                    Details
                    <ArrowRight className="size-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )
      )}

      {picking && <HighlightPickerDialog open={picking} onOpenChange={setPicking} />}
    </section>
  );
}
