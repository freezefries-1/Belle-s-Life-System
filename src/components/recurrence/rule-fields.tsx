"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WEEKDAYS } from "@/lib/daily/commitments";
import { parseISODate } from "@/lib/date";
import { FREQUENCY_OPTIONS, describeRule, nextOccurrence, normalizeRule } from "@/lib/recurrence/recurrence";
import { relativeDayLabel } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { ISODate, RecurrenceRule } from "@/types";

/** Editing controls for a recurrence rule, with a plain-English summary. */
export function RuleFields({
  rule,
  onChange,
  today,
  idPrefix = "rule",
}: {
  rule: RecurrenceRule;
  onChange: (rule: RecurrenceRule) => void;
  today: ISODate;
  idPrefix?: string;
}) {
  const set = (patch: Partial<RecurrenceRule>) => onChange({ ...rule, ...patch });
  const usesWeekdays = rule.frequency === "weekly" || rule.frequency === "biweekly" || (rule.frequency === "custom" && rule.intervalUnit === "weeks");
  const startWeekday = /^\d{4}-\d{2}-\d{2}$/.test(rule.startDate) ? parseISODate(rule.startDate).getDay() : 1;
  const weekdays = rule.selectedWeekdays.length ? rule.selectedWeekdays : [startWeekday];
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(rule.startDate);
  const next = valid ? nextOccurrence(normalizeRule(rule), rule.startDate > today ? rule.startDate : today) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Repeats">
        {FREQUENCY_OPTIONS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="radio"
            aria-checked={rule.frequency === f.id}
            onClick={() => set({ frequency: f.id })}
            className={cn(
              "h-8 cursor-pointer rounded-lg border px-2.5 text-xs font-semibold transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none",
              rule.frequency === f.id ? "border-primary/40 bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {rule.frequency === "custom" && (
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <span>Every</span>
          <Input
            type="number"
            min={1}
            max={365}
            value={rule.interval}
            onChange={(e) => set({ interval: Math.max(1, Number(e.target.value) || 1) })}
            aria-label="Interval"
            className="h-8 w-20"
          />
          <div className="inline-flex rounded-lg bg-muted p-1" role="radiogroup" aria-label="Interval unit">
            {(["days", "weeks"] as const).map((u) => (
              <button
                key={u}
                type="button"
                role="radio"
                aria-checked={rule.intervalUnit === u}
                onClick={() => set({ intervalUnit: u })}
                className={cn(
                  "h-6 cursor-pointer rounded-md px-2.5 text-xs font-semibold text-muted-foreground",
                  rule.intervalUnit === u && "bg-card text-foreground shadow-sm",
                )}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      )}

      {usesWeekdays && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="On these days">
          {WEEKDAYS.map((d) => {
            const on = weekdays.includes(d.value);
            return (
              <button
                key={d.value}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  const next = on ? weekdays.filter((x) => x !== d.value) : [...weekdays, d.value];
                  if (next.length) set({ selectedWeekdays: next });
                }}
                className={cn(
                  "h-8 min-w-11 cursor-pointer rounded-md border px-2 text-xs font-semibold transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none",
                  on ? "border-primary/50 bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted",
                )}
              >
                {d.short}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-start`}>Starts</Label>
          <Input id={`${idPrefix}-start`} type="date" value={rule.startDate} onChange={(e) => set({ startDate: e.target.value })} className="w-44" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-end`}>
            Ends <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id={`${idPrefix}-end`}
            type="date"
            value={rule.endDate ?? ""}
            min={rule.startDate}
            onChange={(e) => set({ endDate: e.target.value || null })}
            className="w-44"
          />
        </div>
      </div>

      {valid && (
        <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          {describeRule(normalizeRule(rule))}
          {next ? ` · next ${relativeDayLabel(next, today).toLowerCase()}` : " · no upcoming dates"}
        </p>
      )}
    </div>
  );
}

export function defaultRule(startDate: ISODate): RecurrenceRule {
  return { frequency: "weekly", interval: 1, intervalUnit: "weeks", selectedWeekdays: [], startDate, endDate: null };
}
