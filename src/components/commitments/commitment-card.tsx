"use client";

import * as React from "react";
import { Archive, ArchiveRestore, MoreHorizontal, Pause, Pencil, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { CommitmentHistory } from "@/components/shared/commitment-history";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { addDays, formatWeekday } from "@/lib/date";
import { fallsOn, frequencyLabel, getRecentHistory, getStreak, isScheduledOn } from "@/lib/daily/commitments";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn, formatMinutes } from "@/lib/utils";
import type { MicroCommitment } from "@/types";

import { CommitmentCheck } from "./commitment-check";
import { CommitmentEditorDialog } from "./commitment-editor-dialog";

/** Full card for the Micro-Commitments page: today's tick, rhythm, gentle streak, and management. */
export function CommitmentCard({ commitment }: { commitment: MicroCommitment }) {
  const { workspace, actions } = useWorkspace();
  const [editing, setEditing] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const { today, commitmentCompletions } = workspace;
  const active = commitment.status === "active";
  const scheduledToday = isScheduledOn(commitment, today, commitmentCompletions);
  const streak = getStreak(commitment, today, commitmentCompletions);
  const history = getRecentHistory(commitment, today, commitmentCompletions, commitment.frequency === "weekly" ? 8 : 14);
  const weekly = commitment.frequency === "weekly";

  let nextNote: string | null = null;
  if (active && !scheduledToday) {
    if (today < commitment.startDate) nextNote = `Starts ${commitment.startDate}`;
    else if (weekly) nextNote = "Done this week";
    else {
      for (let i = 1; i <= 7; i++) {
        const d = addDays(today, i);
        if (fallsOn(commitment, d)) {
          nextNote = `Next: ${i === 1 ? "tomorrow" : formatWeekday(d, "long")}`;
          break;
        }
      }
    }
  }

  const setStatus = (status: MicroCommitment["status"], message: string) => {
    const previous = commitment.status;
    actions.setCommitmentStatus(commitment.id, status);
    toast(message, {
      description: commitment.title,
      action: { label: "Undo", onClick: () => actions.setCommitmentStatus(commitment.id, previous) },
    });
  };

  return (
    <Card className={cn("p-4 sm:p-5", !active && "bg-card/70")}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          {active && scheduledToday ? (
            <CommitmentCheck commitment={commitment} date={today} className="-mx-2 -my-2" />
          ) : (
            <div>
              <p className="text-[14px] font-semibold">{commitment.title}</p>
              {commitment.targetMinutes != null && (
                <p className="mt-0.5 text-xs text-muted-foreground">{formatMinutes(commitment.targetMinutes)}</p>
              )}
            </div>
          )}
          {commitment.description && <p className="mt-2 text-[13px] text-muted-foreground">{commitment.description}</p>}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {frequencyLabel(commitment)}
            </span>
            {commitment.status === "paused" && (
              <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">Paused</span>
            )}
            {commitment.status === "archived" && (
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">Archived</span>
            )}
            {nextNote && <span className="text-[11px] text-muted-foreground">{nextNote}</span>}
            {active && streak.count >= 2 && (
              <span className="text-[11px] font-semibold text-primary">
                {streak.count}-{streak.unit.replace(/s$/, "")} streak
              </span>
            )}
          </div>
        </div>

        <div className="flex items-start justify-between gap-3 sm:flex-col sm:items-end">
          <div className="flex flex-col gap-1.5 sm:items-end">
            <CommitmentHistory
              commitment={commitment}
              completions={commitmentCompletions}
              today={today}
              count={weekly ? 8 : 14}
              showLabels
            />
            <p className="text-xs text-muted-foreground tabular-nums">
              {history.scheduled === 0
                ? "Nothing scheduled yet"
                : `Done ${history.done} of the last ${history.scheduled} scheduled ${weekly ? "weeks" : "days"}`}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-xs" aria-label={`Manage “${commitment.title}”`} className="sm:order-first">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onSelect={() => setEditing(true)}>
                <Pencil />
                Edit
              </DropdownMenuItem>
              {commitment.status === "active" && (
                <DropdownMenuItem onSelect={() => setStatus("paused", "Paused — history kept")}>
                  <Pause />
                  Pause
                </DropdownMenuItem>
              )}
              {commitment.status === "paused" && (
                <DropdownMenuItem onSelect={() => setStatus("active", "Resumed. Ready for a fresh start.")}>
                  <Play />
                  Resume
                </DropdownMenuItem>
              )}
              {commitment.status !== "archived" ? (
                <DropdownMenuItem onSelect={() => setStatus("archived", "Archived — history kept")}>
                  <Archive />
                  Archive
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={() => setStatus("active", "Restored")}>
                  <ArchiveRestore />
                  Restore
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setConfirmDelete(true)} className="text-rose-700 focus:text-rose-800">
                <Trash2 className="text-rose-500" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {editing && <CommitmentEditorDialog commitment={commitment} open={editing} onOpenChange={setEditing} />}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete “{commitment.title}”?</DialogTitle>
            <DialogDescription>
              This also removes its completion history. To keep the history, archive it instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={() => (setConfirmDelete(false), setStatus("archived", "Archived — history kept"))}>
              Archive instead
            </Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() => {
                actions.deleteCommitment(commitment.id);
                setConfirmDelete(false);
                toast("Commitment deleted", { description: commitment.title });
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
