"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WEEKDAYS } from "@/lib/daily/commitments";
import { isValidISODate } from "@/lib/date";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn, formatMinutes } from "@/lib/utils";
import type { CommitmentFrequency, MicroCommitment } from "@/types";

const FREQUENCIES: { id: CommitmentFrequency; label: string; hint: string }[] = [
  { id: "daily", label: "Every day", hint: "Shows up every day." },
  { id: "weekdays", label: "Selected days", hint: "Only on the days you pick." },
  { id: "weekly", label: "Once a week", hint: "Any day that week — it waits until you do it." },
];

const TARGETS = [5, 10, 15, 20, 30];

/** Create or edit a micro-commitment. Only the title is required. */
export function CommitmentEditorDialog({
  commitment,
  open,
  onOpenChange,
}: {
  commitment?: MicroCommitment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { workspace, actions } = useWorkspace();
  const [title, setTitle] = React.useState(commitment?.title ?? "");
  const [description, setDescription] = React.useState(commitment?.description ?? "");
  const [target, setTarget] = React.useState(commitment?.targetMinutes != null ? String(commitment.targetMinutes) : "");
  const [frequency, setFrequency] = React.useState<CommitmentFrequency>(commitment?.frequency ?? "daily");
  const [weekdays, setWeekdays] = React.useState<number[]>(commitment?.selectedWeekdays ?? [1, 2, 3, 4, 5]);
  const [startDate, setStartDate] = React.useState(commitment?.startDate ?? workspace.today);

  const targetMinutes = target.trim() ? Math.round(Number(target)) : null;
  const targetValid = targetMinutes === null || (Number.isFinite(targetMinutes) && targetMinutes > 0 && targetMinutes <= 600);
  const daysValid = frequency !== "weekdays" || weekdays.length > 0;
  const valid = title.trim().length > 0 && targetValid && daysValid && isValidISODate(startDate);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!valid) return;
    const input = {
      title,
      description,
      targetMinutes,
      frequency,
      selectedWeekdays: frequency === "weekdays" ? weekdays : [],
      startDate,
    };
    if (commitment) {
      actions.updateCommitment(commitment.id, input);
      toast("Your changes have been saved.", { description: title.trim() });
    } else {
      actions.createCommitment(input);
      toast("Commitment added", { description: title.trim() });
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-4 max-h-[calc(100dvh-2rem)] max-w-lg overflow-y-auto sm:top-[8%]">
        <DialogHeader>
          <DialogTitle>{commitment ? "Edit commitment" : "New micro-commitment"}</DialogTitle>
          <DialogDescription>Make it small enough to do on a busy day.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="mc-title">Title</Label>
            <Input
              id="mc-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Read 5 pages"
              maxLength={200}
              autoComplete="off"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="mc-description" className="text-muted-foreground">
              Description
            </Label>
            <Textarea
              id="mc-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional — what counts, or when you’ll do it"
              className="min-h-14"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="mc-target">
              Target time <span className="font-normal text-muted-foreground">(optional, minutes)</span>
            </Label>
            <div className="flex flex-wrap items-center gap-1.5">
              <Input
                id="mc-target"
                type="number"
                inputMode="numeric"
                min={1}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                aria-invalid={!targetValid}
                className="w-20"
              />
              {TARGETS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setTarget(String(m))}
                  aria-pressed={target === String(m)}
                  className={cn(
                    "h-7 cursor-pointer rounded-md border px-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none",
                    target === String(m) && "border-primary/40 bg-accent text-accent-foreground",
                  )}
                >
                  {formatMinutes(m)}
                </button>
              ))}
            </div>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[13px] font-semibold">How often</legend>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3" role="radiogroup" aria-label="How often">
              {FREQUENCIES.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  role="radio"
                  aria-checked={frequency === f.id}
                  onClick={() => setFrequency(f.id)}
                  className={cn(
                    "cursor-pointer rounded-lg border px-3 py-2 text-left transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none",
                    frequency === f.id ? "border-primary/50 bg-accent" : "hover:bg-muted",
                  )}
                >
                  <span className="block text-xs font-semibold">{f.label}</span>
                  <span className="block text-[11px] text-muted-foreground">{f.hint}</span>
                </button>
              ))}
            </div>
            {frequency === "weekdays" && (
              <div className="mt-1 flex flex-wrap gap-1.5" role="group" aria-label="Days">
                {WEEKDAYS.map((d) => {
                  const on = weekdays.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setWeekdays((list) => (on ? list.filter((x) => x !== d.value) : [...list, d.value]))
                      }
                      className={cn(
                        "h-8 min-w-11 cursor-pointer rounded-md border px-2 text-xs font-semibold transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none",
                        on ? "border-primary/50 bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {d.short}
                    </button>
                  );
                })}
                {!daysValid && <p className="w-full text-xs text-amber-700">Pick at least one day.</p>}
              </div>
            )}
          </fieldset>

          <div className="flex flex-col gap-2">
            <Label htmlFor="mc-start">Start date</Label>
            <Input id="mc-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-44" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid}>
              {commitment ? "Save changes" : "Add commitment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
