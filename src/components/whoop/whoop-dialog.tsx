"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatShortDate } from "@/lib/date";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";
import { ZONE_LABEL, ZONE_STYLE, dayOn, parsePercent, zoneOf } from "@/lib/whoop/whoop";
import type { ISODate } from "@/types";

/** Type in a day's WHOOP recovery % and sleep %. Opening it on a day that has numbers edits them. */
export function WhoopDialog({
  initialDate,
  open,
  onOpenChange,
  onCloseAutoFocus,
}: {
  initialDate?: ISODate;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Where focus goes when the dialog closes, if not back to the button that opened it. */
  onCloseAutoFocus?: (e: Event) => void;
}) {
  const { workspace, actions } = useWorkspace();
  const [date, setDate] = React.useState(initialDate ?? workspace.today);
  const existing = dayOn(workspace.whoopDays, date);
  const [recovery, setRecovery] = React.useState(existing?.recovery?.toString() ?? "");
  const [sleep, setSleep] = React.useState(existing?.sleep?.toString() ?? "");

  // Picking another date shows what's saved for that day (if anything).
  function changeDate(next: string) {
    setDate(next);
    const day = dayOn(workspace.whoopDays, next);
    setRecovery(day?.recovery?.toString() ?? "");
    setSleep(day?.sleep?.toString() ?? "");
  }

  const r = parsePercent(recovery);
  const s = parsePercent(sleep);
  const bad = r === undefined || s === undefined;
  const empty = r === null && s === null;
  const valid = !!date && !bad && !empty;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    actions.setWhoopDay(date, { recovery: r ?? null, sleep: s ?? null });
    const parts = [r != null ? `Recovery ${r}%` : null, s != null ? `Sleep ${s}%` : null].filter(Boolean).join(" · ");
    toast(date === workspace.today ? "Today’s WHOOP saved" : `WHOOP saved for ${formatShortDate(date)}`, { description: parts });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader>
          <DialogTitle>{existing ? "Edit recovery & sleep" : "Add recovery & sleep"}</DialogTitle>
          <DialogDescription>Copy the numbers from your WHOOP app. You can leave one blank.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="whoop-date">Date</Label>
            <Input id="whoop-date" type="date" value={date} max={workspace.today} onChange={(e) => changeDate(e.target.value)} className="w-44" />
          </div>
          <div className="flex flex-wrap gap-4">
            <PercentField id="whoop-recovery" label="Recovery %" value={recovery} onChange={setRecovery} parsed={r} autoFocus zoned />
            <PercentField id="whoop-sleep" label="Sleep %" value={sleep} onChange={setSleep} parsed={s} />
          </div>
          {bad && (
            <p role="alert" className="text-xs text-rose-700">
              Enter whole numbers from 0 to 100.
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PercentField({
  id,
  label,
  value,
  onChange,
  parsed,
  autoFocus,
  zoned = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  parsed: number | null | undefined;
  autoFocus?: boolean;
  zoned?: boolean;
}) {
  const zone = zoned && typeof parsed === "number" ? zoneOf(parsed) : null;
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          autoFocus={autoFocus}
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={parsed === undefined}
          className="w-24"
          autoComplete="off"
        />
        <span className={cn("text-xs font-semibold", zone ? ZONE_STYLE[zone].text : "")} aria-live="polite">
          {zone ? ZONE_LABEL[zone] : ""}
        </span>
      </div>
    </div>
  );
}
