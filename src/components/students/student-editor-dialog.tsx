"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspaceActions } from "@/lib/store/workspace-store";
import type { BallColour, PlayerGroup, Student, StudentStatus } from "@/types";

import { BALL_OPTIONS, ChoiceGroup, STUDENT_STATUSES } from "./student-visuals";

/** Add or edit a student. Only the name is required. */
export function StudentEditorDialog({ student, open, onOpenChange }: { student?: Student; open: boolean; onOpenChange: (open: boolean) => void }) {
  const actions = useWorkspaceActions();
  const router = useRouter();
  const [name, setName] = React.useState(student?.name ?? "");
  const [group, setGroup] = React.useState<PlayerGroup>(student?.group ?? "adult");
  const [ball, setBall] = React.useState<BallColour>(student?.ball ?? "yellow");
  const [hand, setHand] = React.useState<Student["hand"]>(student?.hand ?? null);
  const [backhand, setBackhand] = React.useState<Student["backhand"]>(student?.backhand ?? null);
  const [startedOn, setStartedOn] = React.useState(student?.startedOn ?? "");
  const [goals, setGoals] = React.useState(student?.goals ?? "");
  const [notes, setNotes] = React.useState(student?.notes ?? "");
  const [status, setStatus] = React.useState<StudentStatus>(student?.status ?? "active");
  const valid = name.trim().length > 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    const input = { name, group, ball, hand, backhand, startedOn: startedOn || null, goals, notes, status };
    if (student) {
      actions.updateStudent(student.id, input);
      toast("Your changes have been saved.", { description: name.trim() });
      onOpenChange(false);
      return;
    }
    const created = actions.createStudent(input);
    onOpenChange(false);
    if (created) {
      toast("Student added", { description: created.name });
      router.push(`/students/${created.id}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-4 max-h-[calc(100dvh-2rem)] max-w-xl overflow-y-auto sm:top-[6%] sm:max-h-[88dvh]">
        <DialogHeader>
          <DialogTitle>{student ? "Edit student" : "Add a student"}</DialogTitle>
          <DialogDescription>A first name or nickname is enough. Keep it to what helps your coaching.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="student-name">Name</Label>
            <Input id="student-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mia" maxLength={100} autoComplete="off" />
          </div>
          <ChoiceGroup
            legend="Group"
            name="student-group"
            value={group}
            onChange={setGroup}
            options={[
              { value: "junior", label: "Junior" },
              { value: "adult", label: "Adult" },
            ]}
          />
          <ChoiceGroup legend="Ball" name="student-ball" value={ball} onChange={setBall} options={BALL_OPTIONS} />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <ChoiceGroup
              legend="Plays"
              name="student-hand"
              value={hand}
              onChange={setHand}
              options={[
                { value: "right", label: "Right-handed" },
                { value: "left", label: "Left-handed" },
              ]}
            />
            <ChoiceGroup
              legend="Backhand"
              name="student-backhand"
              value={backhand}
              onChange={setBackhand}
              options={[
                { value: "two", label: "Two-handed" },
                { value: "one", label: "One-handed" },
              ]}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="student-started">Started lessons</Label>
            <Input id="student-started" type="date" value={startedOn} onChange={(e) => setStartedOn(e.target.value)} className="w-44" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="student-goals">Goals</Label>
            <Textarea id="student-goals" value={goals} onChange={(e) => setGoals(e.target.value)} placeholder="e.g. Rally from the baseline; play club competitions" className="min-h-14" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="student-notes">Notes</Label>
            <Textarea id="student-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything useful to remember" className="min-h-14" />
          </div>
          {student && <ChoiceGroup legend="Status" name="student-status" value={status} onChange={setStatus} options={STUDENT_STATUSES} />}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid}>
              {student ? "Save changes" : "Add student"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
