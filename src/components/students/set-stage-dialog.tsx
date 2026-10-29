"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TRACK_BY_ID, stageIndex } from "@/lib/students/ladder";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";
import type { Student, TrackId } from "@/types";

/** Record the stage a student has reached on one track (any stage, with a date and an optional note). */
export function SetStageDialog({
  student,
  track,
  current,
  initialStage,
  open,
  onOpenChange,
}: {
  student: Student;
  track: TrackId;
  current: string | null;
  initialStage?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { workspace, actions } = useWorkspace();
  const def = TRACK_BY_ID[track];
  const [stage, setStage] = React.useState(initialStage ?? current ?? def.stages[0].id);
  // Opened from the history to change an entry: start from its date and note.
  const existing = initialStage
    ? workspace.studentStages.find((s) => s.studentId === student.id && s.track === track && s.stage === initialStage)
    : undefined;
  const [date, setDate] = React.useState(existing?.reachedOn ?? workspace.today);
  const [note, setNote] = React.useState(existing?.note ?? "");
  const backwards = current !== null && stageIndex(track, stage) < stageIndex(track, current);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return;
    actions.setStudentStage(student.id, track, stage, date, note);
    toast(`${student.name}: ${stage} · ${def.stages.find((s) => s.id === stage)?.name}`, { description: `${def.name} track` });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-4 max-h-[calc(100dvh-2rem)] max-w-lg overflow-y-auto sm:top-[6%] sm:max-h-[88dvh]">
        <DialogHeader>
          <DialogTitle>
            {def.name}: {student.name}
          </DialogTitle>
          <DialogDescription>Choose the stage {student.name} has reached, and when.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-1.5">
            <legend className="sr-only">Stage</legend>
            {def.stages.map((s) => (
              <label
                key={s.id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 text-[13px] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/50",
                  stage === s.id ? "border-primary bg-accent" : "hover:bg-muted/50",
                )}
              >
                <input type="radio" name="stage" value={s.id} checked={stage === s.id} onChange={() => setStage(s.id)} className="mt-0.5 size-4 accent-primary" />
                <span className="min-w-0">
                  <span className="font-semibold">
                    {s.id} · {s.name}
                  </span>
                  {current === s.id && <span className="ml-1.5 text-xs text-muted-foreground">(current)</span>}
                  <span className="block text-xs text-muted-foreground">{s.focus}</span>
                </span>
              </label>
            ))}
          </fieldset>
          {backwards && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
              This is earlier than their current stage ({current}). It’s added to their history; the current stage stays {current}. To correct a mistake,
              remove the wrong entry from the history instead.
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[auto_1fr]">
            <div className="flex flex-col gap-2">
              <Label htmlFor="stage-date">Reached on</Label>
              <Input id="stage-date" type="date" value={date} max={workspace.today} onChange={(e) => setDate(e.target.value)} className="w-44" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="stage-note">Note (optional)</Label>
              <Input id="stage-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. 20-ball rally today" maxLength={300} autoComplete="off" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!date}>
              Save stage
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
