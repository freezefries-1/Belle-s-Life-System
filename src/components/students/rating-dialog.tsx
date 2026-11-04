"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatRating } from "@/lib/students/performance";
import { useWorkspace } from "@/lib/store/workspace-store";
import type { MatchFormat, Student, StudentRating } from "@/types";

import { ChoiceGroup } from "./student-visuals";

/** Record (or edit) a DUPR rating: singles or doubles, on a date. */
export function RatingDialog({
  student,
  rating,
  initialKind = "doubles",
  open,
  onOpenChange,
}: {
  student: Student;
  rating?: StudentRating;
  initialKind?: MatchFormat;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { workspace, actions } = useWorkspace();
  const [kind, setKind] = React.useState<MatchFormat>(rating?.kind ?? initialKind);
  const [value, setValue] = React.useState(rating ? String(rating.rating) : "");
  const [ratedOn, setRatedOn] = React.useState(rating?.ratedOn ?? workspace.today);
  const [note, setNote] = React.useState(rating?.note ?? "");
  const number = Number(value.replace(",", "."));
  const ok = value.trim() !== "" && Number.isFinite(number) && number >= 1 && number <= 9;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ok || !ratedOn) return;
    const input = { kind, rating: number, ratedOn, note };
    if (rating) actions.updateRating(rating.id, input);
    else actions.addRating(student.id, input);
    toast(`DUPR ${kind} ${formatRating(Math.round(number * 1000) / 1000)}`, { description: rating ? "Saved" : "Added to your rating history" });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-4 max-w-md sm:top-[12%]">
        <DialogHeader>
          <DialogTitle>{rating ? "Edit rating" : "Add a DUPR rating"}</DialogTitle>
          <DialogDescription>Copy it from the DUPR app whenever it changes — the history builds your chart.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <ChoiceGroup
            legend="Rating"
            name="rating-kind"
            value={kind}
            onChange={setKind}
            options={[
              { value: "doubles", label: "Doubles" },
              { value: "singles", label: "Singles" },
            ]}
          />
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="rating-value">DUPR</Label>
              <Input
                id="rating-value"
                autoFocus
                inputMode="decimal"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="e.g. 4.123"
                aria-invalid={value.trim() !== "" && !ok}
                className="w-28"
                autoComplete="off"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="rating-date">Date</Label>
              <Input id="rating-date" type="date" value={ratedOn} max={workspace.today} onChange={(e) => setRatedOn(e.target.value)} className="w-44" />
            </div>
          </div>
          {value.trim() !== "" && !ok && (
            <p role="alert" className="text-xs text-rose-700">
              Enter a DUPR rating between 1 and 9, e.g. 4.123.
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="rating-note">Note (optional)</Label>
            <Input id="rating-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. after the league finals" maxLength={200} autoComplete="off" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!ok || !ratedOn}>
              {rating ? "Save rating" : "Add rating"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
