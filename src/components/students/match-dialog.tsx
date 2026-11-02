"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MATCH_KIND_LABELS, percent } from "@/lib/students/performance";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";
import type { MatchKind, Student, StudentMatch, StudentMatchInput } from "@/types";

import { ChoiceGroup } from "./student-visuals";

type StatKey = "firstIn" | "firstTotal" | "secondIn" | "secondTotal" | "doubleFaults" | "unforcedErrors" | "winners";
const STAT_KEYS: StatKey[] = ["firstIn", "firstTotal", "secondIn", "secondTotal", "doubleFaults", "unforcedErrors", "winners"];

const toText = (n: number | null) => (n === null ? "" : String(n));
/** A whole number ≥ 0, or null if blank; undefined if it isn't a valid number. */
function toCount(text: string): number | null | undefined {
  const t = text.trim();
  if (!t) return null;
  return /^\d{1,5}$/.test(t) ? Number(t) : undefined;
}

/** Add or edit a match. Only the date and result are required; every stat is optional. */
export function MatchDialog({ student, match, open, onOpenChange }: { student: Student; match?: StudentMatch; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { workspace, actions } = useWorkspace();
  const [playedOn, setPlayedOn] = React.useState(match?.playedOn ?? workspace.today);
  const [kind, setKind] = React.useState<MatchKind>(match?.kind ?? "tournament");
  const [event, setEvent] = React.useState(match?.event ?? "");
  const [opponent, setOpponent] = React.useState(match?.opponent ?? "");
  const [result, setResult] = React.useState<"win" | "loss" | null>(match?.result ?? null);
  const [score, setScore] = React.useState(match?.score ?? "");
  const [notes, setNotes] = React.useState(match?.notes ?? "");
  const [stats, setStats] = React.useState<Record<StatKey, string>>(
    () => Object.fromEntries(STAT_KEYS.map((k) => [k, toText(match?.[k] ?? null)])) as Record<StatKey, string>,
  );
  const [showStats, setShowStats] = React.useState(!!match && STAT_KEYS.some((k) => match[k] !== null));

  const counts = Object.fromEntries(STAT_KEYS.map((k) => [k, toCount(stats[k])])) as Record<StatKey, number | null | undefined>;
  const badNumber = STAT_KEYS.find((k) => counts[k] === undefined);
  const firstTooMany = counts.firstIn != null && counts.firstTotal != null && counts.firstIn > counts.firstTotal;
  const secondTooMany = counts.secondIn != null && counts.secondTotal != null && counts.secondIn > counts.secondTotal;
  const valid = !!playedOn && !!result && !badNumber && !firstTooMany && !secondTooMany;
  const firstPct = percent(counts.firstIn ?? null, counts.firstTotal ?? null);
  const secondPct = percent(counts.secondIn ?? null, counts.secondTotal ?? null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || !result) return;
    const input: StudentMatchInput = {
      playedOn,
      kind,
      event,
      opponent,
      result,
      score,
      notes,
      ...(Object.fromEntries(STAT_KEYS.map((k) => [k, counts[k] ?? null])) as Record<StatKey, number | null>),
    };
    if (match) {
      actions.updateMatch(match.id, input);
      toast("Match saved", { description: student.name });
    } else if (actions.addMatch(student.id, input)) {
      toast(result === "win" ? "Win recorded" : "Match recorded", { description: `${student.name}${score.trim() ? ` · ${score.trim()}` : ""}` });
    }
    onOpenChange(false);
  }

  const statInput = (key: StatKey, label: string) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`match-${key}`} className="text-xs">
        {label}
      </Label>
      <Input
        id={`match-${key}`}
        inputMode="numeric"
        value={stats[key]}
        onChange={(e) => setStats((s) => ({ ...s, [key]: e.target.value }))}
        aria-invalid={counts[key] === undefined}
        className="w-24"
        autoComplete="off"
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-4 max-h-[calc(100dvh-2rem)] max-w-lg overflow-y-auto sm:top-[6%] sm:max-h-[88dvh]">
        <DialogHeader>
          <DialogTitle>
            {match ? "Edit match" : "Add a match"}: {student.name}
          </DialogTitle>
          <DialogDescription>Singles. Only the date and result are needed; everything else is optional.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="match-date">Date</Label>
              <Input id="match-date" type="date" value={playedOn} onChange={(e) => setPlayedOn(e.target.value)} className="w-44" />
            </div>
            <ChoiceGroup
              legend="Result"
              name="match-result"
              value={result}
              onChange={setResult}
              options={[
                { value: "win", label: "Win" },
                { value: "loss", label: "Loss" },
              ]}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="match-score">Score</Label>
            <Input id="match-score" value={score} onChange={(e) => setScore(e.target.value)} placeholder="e.g. 6-4 3-6 10-7" maxLength={60} autoComplete="off" />
          </div>
          <ChoiceGroup
            legend="Type"
            name="match-kind"
            value={kind}
            onChange={setKind}
            options={(Object.keys(MATCH_KIND_LABELS) as MatchKind[]).map((k) => ({ value: k, label: MATCH_KIND_LABELS[k] }))}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="match-event">Event</Label>
              <Input id="match-event" value={event} onChange={(e) => setEvent(e.target.value)} placeholder="e.g. STA Junior Tour" maxLength={120} autoComplete="off" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="match-opponent">Opponent (optional)</Label>
              <Input id="match-opponent" value={opponent} onChange={(e) => setOpponent(e.target.value)} placeholder="First name or club" maxLength={80} autoComplete="off" />
            </div>
          </div>

          <div className="rounded-xl border bg-muted/30">
            <button
              type="button"
              aria-expanded={showStats}
              onClick={() => setShowStats((s) => !s)}
              className="flex w-full cursor-pointer items-center justify-between rounded-xl px-3.5 py-2.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
            >
              Match stats (optional)
              <ChevronDown className={cn("size-4 transition-transform", showStats && "rotate-180")} />
            </button>
            {showStats && (
              <div className="flex flex-col gap-4 border-t px-3.5 pt-3 pb-4">
                <p className="text-xs text-muted-foreground">Fill in only what was counted. Percentages are worked out for you.</p>
                <fieldset className="flex flex-wrap items-end gap-3">
                  <legend className="mb-1.5 text-[13px] font-semibold">First serves</legend>
                  {statInput("firstIn", "In")}
                  {statInput("firstTotal", "Hit")}
                  <p className="pb-2 text-[13px] font-semibold tabular-nums" aria-live="polite">
                    {firstPct !== null ? `${firstPct}% in` : ""}
                  </p>
                </fieldset>
                <fieldset className="flex flex-wrap items-end gap-3">
                  <legend className="mb-1.5 text-[13px] font-semibold">Second serves</legend>
                  {statInput("secondIn", "In")}
                  {statInput("secondTotal", "Hit")}
                  <p className="pb-2 text-[13px] font-semibold tabular-nums" aria-live="polite">
                    {secondPct !== null ? `${secondPct}% in` : ""}
                  </p>
                </fieldset>
                <div className="flex flex-wrap gap-3">
                  {statInput("doubleFaults", "Double faults")}
                  {statInput("unforcedErrors", "Unforced errors")}
                  {statInput("winners", "Winners")}
                </div>
                {(badNumber || firstTooMany || secondTooMany) && (
                  <p role="alert" className="text-xs text-rose-700">
                    {badNumber ? "Stats are whole numbers (or leave them blank)." : "Serves in can't be more than serves hit."}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="match-notes">Notes</Label>
            <Textarea id="match-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What went well, what to work on" className="min-h-14" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid}>
              {match ? "Save match" : "Add match"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
