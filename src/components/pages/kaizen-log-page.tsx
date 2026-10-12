"use client";

import * as React from "react";
import { Check, Inbox, Lightbulb, Sprout, Star } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatLongDate, formatShortDate, formatWeekday, localDateOf, relativeDayLabel } from "@/lib/date";
import { isCommitmentDone } from "@/lib/selectors";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";
import type { KaizenEntry } from "@/types";

const ENERGY = ["Drained", "Low", "Steady", "Good", "Energised"];

export function KaizenLogPage() {
  const { workspace } = useWorkspace();
  const [selectedId, setSelectedId] = React.useState(workspace.kaizenEntries[0]?.id);

  // Today's entry mirrors live Brain Dump data so the log and Today page agree.
  const entries = React.useMemo(
    () =>
      workspace.kaizenEntries.map((e): KaizenEntry =>
        e.date === workspace.today
          ? {
              ...e,
              highlight: workspace.highlightPreview.title,
              highlightDone: false,
              brainDump: workspace.captures
                .filter((c) => localDateOf(c.createdAt) === workspace.today)
                .map((c) => c.title),
              commitments: workspace.commitments.map((c) => ({
                title: c.title,
                done: isCommitmentDone(c, workspace.today),
              })),
            }
          : e,
      ),
    [workspace],
  );
  const entry = entries.find((e) => e.id === selectedId) ?? entries[0];

  return (
    <>
      <PageHeader
        title="Kaizen Log"
        description="One small page a day. Notice what worked, choose one tiny improvement, and carry it into tomorrow. Past entries are samples for now."
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav aria-label="Log entries" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
          {entries.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setSelectedId(e.id)}
              aria-current={e.id === entry.id ? "true" : undefined}
              className={cn(
                "flex shrink-0 cursor-pointer items-center gap-3 rounded-xl border bg-card px-3.5 py-3 text-left transition-colors outline-none hover:border-slate-300 focus-visible:ring-[3px] focus-visible:ring-ring/30",
                e.id === entry.id && "border-primary/40 bg-accent/50 hover:border-primary/40",
              )}
            >
              <span className="flex size-10 shrink-0 flex-col items-center justify-center rounded-lg bg-muted leading-none">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">{formatWeekday(e.date)}</span>
                <span className="text-[15px] font-bold">{formatShortDate(e.date).split(" ")[0]}</span>
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold">{relativeDayLabel(e.date, workspace.today)}</span>
                <span className="block max-w-40 truncate text-xs text-muted-foreground">{e.highlight}</span>
              </span>
            </button>
          ))}
        </nav>

        <EntryView key={entry.id} entry={entry} isToday={entry.date === workspace.today} />
      </div>
    </>
  );
}

function EntryView({ entry, isToday }: { entry: KaizenEntry; isToday: boolean }) {
  const [energy, setEnergy] = React.useState(entry.energy);

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div>
        <p className="text-[11px] font-semibold tracking-wide text-primary uppercase">{isToday ? "Today’s entry" : "Past entry"}</p>
        <h3 className="mt-0.5 text-xl font-semibold tracking-tight">{formatLongDate(entry.date)}</h3>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Card className="p-5">
          <SectionLabel icon={Star} title="Daily highlight" />
          <p className="mt-3 flex items-start gap-2 text-[15px] font-semibold">
            {entry.highlightDone && <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />}
            {entry.highlight}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{entry.highlightDone ? "Completed" : "In progress"}</p>
        </Card>

        <Card className="p-5">
          <SectionLabel icon={Lightbulb} title="Energy" />
          <div className="mt-3 flex gap-1.5" role="radiogroup" aria-label="Energy level">
            {ENERGY.map((label, i) => {
              const value = (i + 1) as KaizenEntry["energy"];
              return (
                <button
                  key={label}
                  type="button"
                  role="radio"
                  aria-checked={energy === value}
                  aria-label={label}
                  disabled={!isToday}
                  onClick={() => setEnergy(value)}
                  className={cn(
                    "h-8 flex-1 cursor-pointer rounded-md border transition-colors disabled:cursor-default",
                    value <= energy ? "border-primary/20 bg-primary/80" : "bg-muted",
                  )}
                />
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{ENERGY[energy - 1]}</p>
        </Card>

        <Card className="p-5">
          <SectionLabel icon={Inbox} title="Brain dump" />
          {entry.brainDump.length ? (
            <ul className="mt-3 flex flex-col gap-1.5 text-[13px]">
              {entry.brainDump.map((b) => (
                <li key={b} className="flex gap-2">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-slate-400" />
                  {b}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[13px] text-muted-foreground">Nothing captured.</p>
          )}
        </Card>

        <Card className="p-5">
          <SectionLabel icon={Sprout} title="Micro-commitments" />
          <ul className="mt-3 flex flex-col gap-2 text-[13px]">
            {entry.commitments.map((c) => (
              <li key={c.title} className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "flex size-4 items-center justify-center rounded-[4px] border",
                    c.done ? "border-primary bg-primary text-white" : "border-slate-300",
                  )}
                >
                  {c.done && <Check className="size-3" strokeWidth={3} />}
                </span>
                <span className={cn(!c.done && "text-muted-foreground")}>{c.title}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="p-5">
        <SectionLabel icon={Lightbulb} title="Reflection" />
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <ReflectionField label="What went well?" value={entry.reflection.wentWell} editable={isToday} />
          <ReflectionField label="What could be better?" value={entry.reflection.improve} editable={isToday} />
          <ReflectionField label="One small step for tomorrow" value={entry.reflection.oneSmallStep} editable={isToday} />
        </div>
        {isToday && <p className="mt-3 text-xs text-muted-foreground">Preview only — journal entries are saved from a later phase.</p>}
      </Card>
    </div>
  );
}

function ReflectionField({ label, value, editable }: { label: string; value: string; editable: boolean }) {
  const id = React.useId();
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {editable ? (
        <Textarea id={id} defaultValue={value} placeholder="A sentence is plenty…" className="min-h-24" />
      ) : (
        <p id={id} className="text-[13px] leading-relaxed">
          {value || "—"}
        </p>
      )}
    </div>
  );
}

function SectionLabel({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <p className="flex items-center gap-2 text-[13px] font-semibold">
      <Icon className="size-4 text-muted-foreground" />
      {title}
    </p>
  );
}
