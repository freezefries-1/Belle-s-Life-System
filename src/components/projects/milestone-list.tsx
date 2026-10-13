"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Flag, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatShortDate } from "@/lib/date";
import { MILESTONE_STATUSES, milestonesOrdered } from "@/lib/projects/project-model";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";
import type { Milestone } from "@/types";

import { MilestoneEditorDialog } from "./milestone-editor-dialog";
import { DeadlineChip, MilestoneStatusBadge } from "./project-visuals";

/** A clean checklist of checkpoints, in the order Belle sets. */
export function MilestoneList({ projectId }: { projectId: string }) {
  const { workspace, actions } = useWorkspace();
  const [editing, setEditing] = React.useState<Milestone | "new" | null>(null);
  const [deleting, setDeleting] = React.useState<Milestone | null>(null);
  const deletingLinked = deleting ? workspace.tasks.filter((t) => t.milestoneId === deleting.id).length : 0;
  const milestones = milestonesOrdered(workspace.milestones, projectId);

  function move(index: number, delta: -1 | 1) {
    const ids = milestones.map((m) => m.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    actions.reorderMilestones(projectId, ids);
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold">
          <Flag className="size-4 text-muted-foreground" />
          Milestones
        </h3>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditing("new")}>
          <Plus className="size-3.5" />
          Add milestone
        </Button>
      </div>

      {milestones.length === 0 ? (
        <p className="mt-3 text-[13px] text-muted-foreground">No milestones yet. Add checkpoints like “Registration closes” or “Finals”.</p>
      ) : (
        <ol className="mt-3 flex flex-col" aria-label="Milestones">
          {milestones.map((m, i) => {
            const done = m.status === "completed";
            const linked = workspace.tasks.filter((t) => t.milestoneId === m.id);
            const linkedDone = linked.filter((t) => t.status === "completed").length;
            return (
              <li key={m.id} id={`milestone-${m.id}`} className="relative flex items-start gap-3 py-2.5 pl-1">
                {i < milestones.length - 1 && <span className="absolute top-8 bottom-0 left-[13px] w-px bg-border" aria-hidden />}
                <Checkbox
                  checked={done}
                  onCheckedChange={() => {
                    actions.updateMilestone(m.id, { status: done ? "upcoming" : "completed" });
                    if (!done) toast("Milestone reached. One small step completed.", { description: m.title });
                  }}
                  aria-label={done ? `Reopen milestone “${m.title}”` : `Complete milestone “${m.title}”`}
                  className="relative z-10 mt-0.5 size-5 rounded-full"
                />
                <div className="min-w-0 flex-1">
                  <p className={cn("text-[13.5px] font-semibold", done && "text-muted-foreground line-through decoration-slate-300")}>{m.title}</p>
                  {m.description && <p className="mt-0.5 text-xs text-muted-foreground">{m.description}</p>}
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {m.status === "in_progress" && <MilestoneStatusBadge status={m.status} />}
                    {m.targetDate && (
                      <span className="inline-flex items-center gap-1.5">
                        {formatShortDate(m.targetDate)}
                        <DeadlineChip date={m.targetDate} today={workspace.today} done={done} />
                      </span>
                    )}
                    {m.preparationDate && !done && <span>Start preparing {formatShortDate(m.preparationDate)}</span>}
                    {linked.length > 0 && (
                      <span>
                        {linkedDone}/{linked.length} tasks
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center text-subtle-foreground">
                  <Button variant="ghost" size="icon-xs" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move “${m.title}” up`}>
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-xs" onClick={() => move(i, 1)} disabled={i === milestones.length - 1} aria-label={`Move “${m.title}” down`}>
                    <ArrowDown className="size-3.5" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-xs" aria-label={`Actions for milestone “${m.title}”`}>
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onSelect={() => setEditing(m)}>
                        <Pencil />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-xs text-muted-foreground">Status</DropdownMenuLabel>
                      {MILESTONE_STATUSES.map((s) => (
                        <DropdownMenuItem key={s.id} disabled={m.status === s.id} onSelect={() => actions.updateMilestone(m.id, { status: s.id })}>
                          <MilestoneStatusBadge status={s.id} />
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-rose-600 focus:text-rose-700"
                        onSelect={() => setDeleting(m)}
                      >
                        <Trash2 className="text-rose-500" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <Dialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete “{deleting?.title}”?</DialogTitle>
            <DialogDescription>
              The milestone, its description and its dates are removed.{" "}
              {deletingLinked > 0
                ? `Its ${deletingLinked} ${deletingLinked === 1 ? "task stays" : "tasks stay"} in the project, just without a milestone.`
                : "No tasks are linked to it."}{" "}
              To keep it, mark it completed instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() => {
                if (!deleting) return;
                actions.deleteMilestone(deleting.id);
                toast(`Milestone deleted${deletingLinked ? " — its tasks are kept" : ""}`, { description: deleting.title });
                setDeleting(null);
              }}
            >
              Delete milestone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editing && (
        <MilestoneEditorDialog
          projectId={projectId}
          milestone={editing === "new" ? undefined : editing}
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}
    </Card>
  );
}
