"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspace } from "@/lib/store/workspace-store";
import type { Student, StudentLesson } from "@/types";

/** Add or edit a lesson note: what you worked on, what went well, what to work on next. */
export function LessonDialog({
  student,
  lesson,
  open,
  onOpenChange,
}: {
  student: Student;
  lesson?: StudentLesson;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { workspace, actions } = useWorkspace();
  const [date, setDate] = React.useState(lesson?.date ?? workspace.today);
  const [focus, setFocus] = React.useState(lesson?.focus ?? "");
  const [wentWell, setWentWell] = React.useState(lesson?.wentWell ?? "");
  const [workOn, setWorkOn] = React.useState(lesson?.workOn ?? "");
  const valid = !!date && (focus.trim() || wentWell.trim() || workOn.trim());

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    const input = { date, focus, wentWell, workOn };
    if (lesson) {
      actions.updateLesson(lesson.id, input);
      toast("Lesson note saved", { description: student.name });
    } else if (actions.addLesson(student.id, input)) {
      toast("Lesson note added", { description: student.name });
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-4 max-h-[calc(100dvh-2rem)] max-w-lg overflow-y-auto sm:top-[8%] sm:max-h-[88dvh]">
        <DialogHeader>
          <DialogTitle>
            {lesson ? "Edit lesson note" : "Lesson note"}: {student.name}
          </DialogTitle>
          <DialogDescription>A line or two is plenty. Fill in whichever parts help.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="lesson-date">Date</Label>
            <Input id="lesson-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="lesson-focus">Worked on</Label>
            <Input id="lesson-focus" autoFocus value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="e.g. Short court rally, reading the bounce" autoComplete="off" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="lesson-well">Went well</Label>
            <Textarea id="lesson-well" value={wentWell} onChange={(e) => setWentWell(e.target.value)} className="min-h-14" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="lesson-next">Work on next</Label>
            <Textarea id="lesson-next" value={workOn} onChange={(e) => setWorkOn(e.target.value)} placeholder="Homework, or the focus for next time" className="min-h-14" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid}>
              {lesson ? "Save changes" : "Add note"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
