"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { KAP_FIELDS, POINT_LOSS_REASONS, kapOf, kindLabels, percent, type KapField } from "@/lib/students/performance";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import type { MatchFormat, MatchKind, Student, StudentMatch, StudentMatchInput } from "@/types";

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

/**
 * Add or edit a match. Only the date and result are required; everything else
 * is optional. Tennis students: singles with serve counts. Pickleball (you):
 * doubles or singles, partner, rated, and tallies of how points were lost.
 */
export function MatchDialog({ student, match, open, onOpenChange }: { student: Student; match?: StudentMatch; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { workspace, actions } = useWorkspace();
  const pickleball = student.sport === "pickleball";
  const labels = kindLabels(student.sport);
  const [format, setFormat] = React.useState<MatchFormat>(match?.format ?? (pickleball ? "doubles" : "singles"));
  const [partner, setPartner] = React.useState(match?.partner ?? "");
  const [rated, setRated] = React.useState(match?.rated ?? pickleball);
  const [losses, setLosses] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(POINT_LOSS_REASONS.map((r) => [r.key, match?.pointLosses[r.key] ? String(match.pointLosses[r.key]) : ""])),
  );
  const [showLosses, setShowLosses] = React.useState(!!match && Object.keys(match.pointLosses).length > 0);
  const kapKeys = Object.keys(KAP_FIELDS) as KapField[];
  const [kap, setKap] = React.useState<Record<KapField, string>>(
    () => Object.fromEntries(kapKeys.map((k) => [k, match?.kapStats[k] ? String(match.kapStats[k]) : ""])) as Record<KapField, string>,
  );
  const [showKap, setShowKap] = React.useState(!!match && Object.keys(match.kapStats).length > 0);
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
  const lossCounts = Object.fromEntries(POINT_LOSS_REASONS.map((r) => [r.key, toCount(losses[r.key])])) as Record<string, number | null | undefined>;
  const badLoss = Object.values(lossCounts).some((v) => v === undefined);
  const kapCounts = Object.fromEntries(kapKeys.map((k) => [k, toCount(kap[k])])) as Record<KapField, number | null | undefined>;
  const badKap = Object.values(kapCounts).some((v) => v === undefined);
  const kapNow = kapOf(Object.fromEntries(Object.entries(kapCounts).filter(([, v]) => typeof v === "number")) as Record<string, number>);
  const valid = !!playedOn && !!result && !badNumber && !firstTooMany && !secondTooMany && !badLoss && !badKap;
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
      ...(Object.fromEntries(STAT_KEYS.map((k) => [k, pickleball ? (match?.[k] ?? null) : (counts[k] ?? null)])) as Record<StatKey, number | null>),
      format,
      partner: format === "doubles" ? partner : "",
      rated,
      pointLosses: Object.fromEntries(Object.entries(lossCounts).filter(([, v]) => typeof v === "number" && v > 0)) as Record<string, number>,
      kapStats: pickleball
        ? (Object.fromEntries(Object.entries(kapCounts).filter(([, v]) => typeof v === "number" && v > 0)) as Record<string, number>)
        : {},
    };
    if (match) {
      actions.updateMatch(match.id, input);
      toast("Match saved", { description: student.name });
    } else if (actions.addMatch(student.id, input)) {
      const who = pickleball ? (format === "doubles" && partner.trim() ? `With ${partner.trim()}` : "") : student.name;
      toast(result === "win" ? "Win recorded" : "Match recorded", { description: [who, score.trim()].filter(Boolean).join(" · ") || undefined });
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
            {match ? "Edit match" : "Add a match"}
            {pickleball ? "" : `: ${student.name}`}
          </DialogTitle>
          <DialogDescription>
            {pickleball ? "Only the date and result are needed; everything else is optional." : "Singles. Only the date and result are needed; everything else is optional."}
          </DialogDescription>
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
            <Input
              id="match-score"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              placeholder={pickleball ? "e.g. 11-7 9-11 11-5" : "e.g. 6-4 3-6 10-7"}
              maxLength={60}
              autoComplete="off"
            />
          </div>
          {pickleball && (
            <div className="flex flex-wrap items-end gap-4">
              <ChoiceGroup
                legend="Format"
                name="match-format"
                value={format}
                onChange={setFormat}
                options={[
                  { value: "doubles", label: "Doubles" },
                  { value: "singles", label: "Singles" },
                ]}
              />
              {format === "doubles" && (
                <div className="flex min-w-40 flex-1 flex-col gap-2">
                  <Label htmlFor="match-partner">Partner</Label>
                  <Input id="match-partner" value={partner} onChange={(e) => setPartner(e.target.value)} placeholder="Name" maxLength={80} autoComplete="off" list="match-partners" />
                  <datalist id="match-partners">
                    {[...new Set(workspace.studentMatches.filter((m) => m.studentId === student.id && m.partner).map((m) => m.partner))].map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                </div>
              )}
              <div className="flex items-center gap-2 pb-2">
                <Checkbox id="match-rated" checked={rated} onCheckedChange={(v) => setRated(v === true)} />
                <Label htmlFor="match-rated" className="font-normal">
                  DUPR rated
                </Label>
              </div>
            </div>
          )}
          <ChoiceGroup
            legend="Type"
            name="match-kind"
            value={kind}
            onChange={setKind}
            options={(Object.keys(labels) as MatchKind[]).map((k) => ({ value: k, label: labels[k] }))}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="match-event">Event</Label>
              <Input
                id="match-event"
                value={event}
                onChange={(e) => setEvent(e.target.value)}
                placeholder={pickleball ? "e.g. 4.5 open doubles" : "e.g. STA Junior Tour"}
                maxLength={120}
                autoComplete="off"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="match-opponent">{pickleball && format === "doubles" ? "Opponents (optional)" : "Opponent (optional)"}</Label>
              <Input
                id="match-opponent"
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                placeholder={pickleball && format === "doubles" ? "e.g. Sam & Lee" : "First name or club"}
                maxLength={80}
                autoComplete="off"
              />
            </div>
          </div>

          {pickleball && (
            <div className="rounded-xl border bg-muted/30">
              <button
                type="button"
                aria-expanded={showKap}
                onClick={() => setShowKap((s) => !s)}
                className="flex w-full cursor-pointer items-center justify-between rounded-xl px-3.5 py-2.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
              >
                Kitchen arrival — KAP (optional)
                <ChevronDown className={cn("size-4 transition-transform", showKap && "rotate-180")} />
              </button>
              {showKap && (
                <div className="flex flex-col gap-3 border-t px-3.5 pt-3 pb-4">
                  <p className="text-xs text-muted-foreground">
                    For each third shot: “arrived” if you both got to the kitchen line balanced, or won the point first. If you didn’t split drops and
                    drives, put everything in one row.
                  </p>
                  {(["drop", "drive"] as const).map((row) => (
                    <fieldset key={row} className="flex flex-wrap items-end gap-3">
                      <legend className="mb-1.5 text-[13px] font-semibold">{row === "drop" ? "Drops" : "Drives"}</legend>
                      {([`${row}_ok`, `${row}_miss`] as KapField[]).map((k) => (
                        <div key={k} className="flex flex-col gap-1.5">
                          <Label htmlFor={`kap-${k}`} className="text-xs">
                            {k.endsWith("_ok") ? "Arrived" : "Didn’t arrive"}
                          </Label>
                          <Input
                            id={`kap-${k}`}
                            inputMode="numeric"
                            value={kap[k]}
                            onChange={(e) => setKap((x) => ({ ...x, [k]: e.target.value }))}
                            aria-invalid={kapCounts[k] === undefined}
                            className="w-20"
                            autoComplete="off"
                          />
                        </div>
                      ))}
                      <p className="pb-2 text-[13px] font-semibold tabular-nums" aria-live="polite">
                        {(row === "drop" ? kapNow.dropKap : kapNow.driveKap) !== null ? `${row === "drop" ? kapNow.dropKap : kapNow.driveKap}% arrived` : ""}
                      </p>
                    </fieldset>
                  ))}
                  <div className="flex flex-wrap gap-3">
                    {(["third_err", "fifth_err", "seventh_err"] as KapField[]).map((k) => (
                      <div key={k} className="flex flex-col gap-1.5">
                        <Label htmlFor={`kap-${k}`} className="text-xs">
                          {KAP_FIELDS[k]}
                        </Label>
                        <Input
                          id={`kap-${k}`}
                          inputMode="numeric"
                          value={kap[k]}
                          onChange={(e) => setKap((x) => ({ ...x, [k]: e.target.value }))}
                          aria-invalid={kapCounts[k] === undefined}
                          className="w-20"
                          autoComplete="off"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-[13px] font-semibold" aria-live="polite">
                    {kapNow.kap !== null
                      ? `KAP ${kapNow.kap}% (${kapNow.arrived} of ${kapNow.thirds} thirds)${kapNow.thirdErrorRate !== null && kapNow.thirdErrors ? ` · 3rd-shot errors ${kapNow.thirdErrorRate}%` : ""}`
                      : ""}
                  </p>
                  {badKap && (
                    <p role="alert" className="text-xs text-rose-700">
                      Counts are whole numbers (or leave them blank).
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {pickleball && (
            <div className="rounded-xl border bg-muted/30">
              <button
                type="button"
                aria-expanded={showLosses}
                onClick={() => setShowLosses((s) => !s)}
                className="flex w-full cursor-pointer items-center justify-between rounded-xl px-3.5 py-2.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
              >
                How points were lost (optional)
                <ChevronDown className={cn("size-4 transition-transform", showLosses && "rotate-180")} />
              </button>
              {showLosses && (
                <div className="flex flex-col gap-3 border-t px-3.5 pt-3 pb-4">
                  <p className="text-xs text-muted-foreground">Rough counts are fine — from memory or video. Leave blank what you didn’t count.</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {POINT_LOSS_REASONS.map((r) => (
                      <div key={r.key} className="flex items-center justify-between gap-2">
                        <Label htmlFor={`loss-${r.key}`} className="text-xs font-normal">
                          {r.label}
                        </Label>
                        <Input
                          id={`loss-${r.key}`}
                          inputMode="numeric"
                          value={losses[r.key]}
                          onChange={(e) => setLosses((l) => ({ ...l, [r.key]: e.target.value }))}
                          aria-invalid={lossCounts[r.key] === undefined}
                          className="w-16 shrink-0"
                          autoComplete="off"
                        />
                      </div>
                    ))}
                  </div>
                  {badLoss && (
                    <p role="alert" className="text-xs text-rose-700">
                      Counts are whole numbers (or leave them blank).
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {!pickleball && (
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
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="match-notes">{pickleball ? "Notes and insights" : "Notes"}</Label>
            <Textarea
              id="match-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={pickleball ? "What worked with this partner, what the opponents did, what to work on" : "What went well, what to work on"}
              className="min-h-14"
            />
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
