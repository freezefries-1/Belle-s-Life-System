"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prepDateFor } from "@/lib/projects/project-model";

/**
 * Target date + optional "start preparing" date. The preparation date can be
 * typed, or worked out as N days before the target. It never creates tasks.
 */
export function DateWithPrep({
  idPrefix,
  targetLabel = "Target date",
  target,
  prep,
  onTarget,
  onPrep,
}: {
  idPrefix: string;
  targetLabel?: string;
  target: string;
  prep: string;
  onTarget: (v: string) => void;
  onPrep: (v: string) => void;
}) {
  const [daysBefore, setDaysBefore] = React.useState("14");
  const prepAfterTarget = !!prep && !!target && prep > target;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-target`}>{targetLabel}</Label>
        <div className="flex items-center gap-1.5">
          <Input id={`${idPrefix}-target`} type="date" value={target} onChange={(e) => onTarget(e.target.value)} className="w-44" />
          {target && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onTarget("")}>
              Clear
            </Button>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-prep`}>
          Start preparing <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <div className="flex items-center gap-1.5">
          <Input id={`${idPrefix}-prep`} type="date" value={prep} onChange={(e) => onPrep(e.target.value)} className="w-44" aria-invalid={prepAfterTarget} />
          {prep && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onPrep("")}>
              Clear
            </Button>
          )}
        </div>
        {target && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>or</span>
            <Input
              type="number"
              min={0}
              max={365}
              value={daysBefore}
              onChange={(e) => setDaysBefore(e.target.value)}
              aria-label="Days before the target date"
              className="h-7 w-16 text-xs"
            />
            <span>days before</span>
            <Button
              type="button"
              variant="outline"
              size="xs"
              disabled={!daysBefore.trim() || Number.isNaN(Number(daysBefore))}
              onClick={() => onPrep(prepDateFor(target, Number(daysBefore)))}
            >
              Set
            </Button>
          </div>
        )}
        {prepAfterTarget && <p className="text-xs text-amber-700">This is after the target date.</p>}
      </div>
    </div>
  );
}
