"use client";

import * as React from "react";
import { HeartPulse, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { StatTile } from "@/components/analytics/stat-tile";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WhoopDialog } from "@/components/whoop/whoop-dialog";
import { addDays, formatShortDate, parseISODate } from "@/lib/date";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";
import { ZONE_LABEL, ZONE_STYLE, average, dayOn, lastDays, sortedDays, zoneCounts, zoneOf, type Zone } from "@/lib/whoop/whoop";
import type { ISODate, WhoopDay } from "@/types";

const RANGES = [
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
] as const;

const weekday = (iso: ISODate) => parseISODate(iso).toLocaleDateString("en-GB", { weekday: "short" });

/** Recovery & sleep: your WHOOP numbers over time — averages, colours and a day-by-day chart. */
export function RecoveryPage() {
  const { workspace } = useWorkspace();
  const [range, setRange] = React.useState<30 | 90>(30);
  // The dialog stays mounted after closing so focus goes back to the button that opened it.
  const [dialog, setDialog] = React.useState<{ date?: ISODate; n: number } | null>(null);
  const [open, setOpen] = React.useState(false);
  const edit = (date?: ISODate) => {
    setDialog((prev) => ({ date, n: (prev?.n ?? 0) + 1 }));
    setOpen(true);
  };

  const today = workspace.today;
  const todayEntry = dayOn(workspace.whoopDays, today);
  const week = lastDays(workspace.whoopDays, today, 7);
  const month = lastDays(workspace.whoopDays, today, 30);
  const inRange = lastDays(workspace.whoopDays, today, range);
  const zones = zoneCounts(inRange);

  return (
    <>
      <PageHeader
        title="Recovery & Sleep"
        description="Your WHOOP recovery and sleep, typed in each day. Green 67–100%, yellow 34–66%, red 0–33%."
        actions={
          <Button onClick={() => edit(todayEntry ? undefined : today)} className="gap-1.5">
            <Plus className="size-4" strokeWidth={2.5} />
            {todayEntry ? "Add a day" : "Add today"}
          </Button>
        }
      />

      {workspace.whoopDays.length === 0 ? (
        <Card className="items-center py-12">
          <EmptyState
            icon={HeartPulse}
            title="No days yet"
            description="Each morning, copy your recovery % and sleep % from the WHOOP app. Your averages and trends build from there."
            className="py-0"
          />
          <Button className="mt-4" onClick={() => edit(today)}>
            Add today’s numbers
          </Button>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <AverageTile label="Recovery, last 7 days" days={week} kind="recovery" />
            <AverageTile label="Sleep, last 7 days" days={week} kind="sleep" />
            <AverageTile label="Recovery, last 30 days" days={month} kind="recovery" />
            <AverageTile label="Sleep, last 30 days" days={month} kind="sleep" />
          </dl>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-semibold">Day by day</h3>
            <Tabs value={String(range)} onValueChange={(v) => setRange(Number(v) as 30 | 90)}>
              <TabsList aria-label="How many days to show">
                {RANGES.map((r) => (
                  <TabsTrigger standalone key={r.days} value={String(r.days)}>
                    {r.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-4">
              <Card className="gap-3 p-4 sm:p-5" role="group" aria-labelledby="recovery-chart-heading">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h4 id="recovery-chart-heading" className="text-[15px] font-semibold">
                    Recovery
                  </h4>
                  <ZoneLegend />
                </div>
                <DayBars days={inRange} today={today} range={range} kind="recovery" />
              </Card>
              <Card className="gap-3 p-4 sm:p-5" role="group" aria-labelledby="sleep-chart-heading">
                <h4 id="sleep-chart-heading" className="text-[15px] font-semibold">
                  Sleep
                </h4>
                <DayBars days={inRange} today={today} range={range} kind="sleep" />
              </Card>
            </div>
            <Card className="gap-3 p-4 sm:p-5" role="group" aria-labelledby="zones-heading">
              <div>
                <h4 id="zones-heading" className="text-[15px] font-semibold">
                  Recovery colours
                </h4>
                <p className="text-xs text-muted-foreground">
                  Last {range} days · {zones.green + zones.yellow + zones.red} days entered
                </p>
              </div>
              <ZoneBreakdown counts={zones} />
            </Card>
          </div>

          <History days={sortedDays(workspace.whoopDays).reverse()} onEdit={edit} />
        </div>
      )}

      {dialog && <WhoopDialog key={dialog.n} initialDate={dialog.date} open={open} onOpenChange={setOpen} />}
    </>
  );
}

function AverageTile({ label, days, kind }: { label: string; days: WhoopDay[]; kind: "recovery" | "sleep" }) {
  const avg = average(days, kind);
  const zone = kind === "recovery" && avg.value !== null ? zoneOf(avg.value) : null;
  return (
    <StatTile
      label={label}
      value={<span className={cn(zone && ZONE_STYLE[zone].text)}>{avg.value === null ? "—" : `${avg.value}%`}</span>}
      note={avg.count ? `average of ${avg.count} ${avg.count === 1 ? "day" : "days"}` : "no days yet"}
    />
  );
}

function ZoneLegend() {
  return (
    <ul className="flex gap-3 text-[11px] text-muted-foreground" aria-label="Colours">
      {(["green", "yellow", "red"] as Zone[]).map((z) => (
        <li key={z} className="flex items-center gap-1">
          <span className={cn("size-2.5 rounded-sm", ZONE_STYLE[z].dot)} aria-hidden />
          {ZONE_LABEL[z]}
        </li>
      ))}
    </ul>
  );
}

/**
 * One bar per day for the range (gaps where nothing was entered). Recovery bars
 * take their WHOOP colour; sleep bars are blue. Readable as a list by screen readers.
 */
function DayBars({ days, today, range, kind }: { days: WhoopDay[]; today: ISODate; range: number; kind: "recovery" | "sleep" }) {
  const byDate = new Map(days.map((d) => [d.date, d[kind]]));
  const slots = Array.from({ length: range }, (_, i) => addDays(today, i - (range - 1)));
  const entered = slots.filter((s) => byDate.get(s) != null);
  const height = 120;
  return (
    <div className="pl-7">
      <div className="relative" style={{ height }}>
        {[100, 50].map((t) => (
          <div key={t} aria-hidden className="absolute inset-x-0 border-t border-border" style={{ top: `${100 - t}%` }}>
            <span className="absolute -top-2 right-full mr-1.5 text-[10px] text-muted-foreground tabular-nums">{t}</span>
          </div>
        ))}
        <div aria-hidden className="absolute inset-x-0 bottom-0 border-t border-border" />
        <ul className={cn("absolute inset-0 ml-0 flex items-end", range > 45 ? "gap-px" : "gap-[3px]")} aria-label={`${kind === "recovery" ? "Recovery" : "Sleep"} by day, last ${range} days`}>
          {slots.map((date) => {
            const v = byDate.get(date) ?? null;
            const zone = kind === "recovery" && v !== null ? zoneOf(v) : null;
            return (
              <li key={date} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={v === null ? undefined : `${formatShortDate(date)}: ${v}%`}>
                {v !== null && (
                  <>
                    <span className="sr-only">
                      {weekday(date)} {formatShortDate(date)}: {v}%{zone ? ` (${ZONE_LABEL[zone]})` : ""}
                    </span>
                    <span
                      aria-hidden
                      className={cn("w-full rounded-t-[2px]", zone ? ZONE_STYLE[zone].bar : "bg-primary/70", date === today && "ring-2 ring-foreground/30")}
                      style={{ height: `${Math.max(2, v)}%` }}
                    />
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground" aria-hidden>
        <span>{formatShortDate(slots[0])}</span>
        <span>Today</span>
      </div>
      {entered.length === 0 && <p className="mt-2 text-xs text-muted-foreground">No {kind} entered in the last {range} days.</p>}
    </div>
  );
}

function ZoneBreakdown({ counts }: { counts: Record<Zone, number> }) {
  const total = counts.green + counts.yellow + counts.red;
  if (total === 0) return <p className="text-[13px] text-muted-foreground">No recovery entered in this range.</p>;
  return (
    <>
      <div className="flex h-3 overflow-hidden rounded-full bg-muted" aria-hidden>
        {(["green", "yellow", "red"] as Zone[]).map((z) => (
          <div key={z} className={ZONE_STYLE[z].bar} style={{ width: `${(counts[z] / total) * 100}%` }} />
        ))}
      </div>
      <ul className="flex flex-col gap-2" aria-label="Days in each colour">
        {(["green", "yellow", "red"] as Zone[]).map((z) => (
          <li key={z} className="flex items-center justify-between gap-2 text-[13px]">
            <span className="flex items-center gap-2">
              <span className={cn("size-2.5 rounded-sm", ZONE_STYLE[z].dot)} aria-hidden />
              {ZONE_LABEL[z]}
            </span>
            <span className="text-muted-foreground tabular-nums">
              {counts[z]} {counts[z] === 1 ? "day" : "days"} · {Math.round((counts[z] / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

function History({ days, onEdit }: { days: WhoopDay[]; onEdit: (date: ISODate) => void }) {
  const { actions } = useWorkspace();
  const [shown, setShown] = React.useState(14);
  return (
    <section aria-labelledby="history-heading" className="flex flex-col gap-3">
      <h3 id="history-heading" className="text-base font-semibold">
        All days <span className="font-normal text-muted-foreground">({days.length})</span>
      </h3>
      <Card className="overflow-hidden py-0">
        <ul className="divide-y" aria-label="Recovery and sleep by day">
          {days.slice(0, shown).map((d) => {
            const zone = d.recovery !== null ? zoneOf(d.recovery) : null;
            return (
              <li key={d.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                <span className="w-24 shrink-0 text-[13px]">
                  <span className="text-muted-foreground">{weekday(d.date)}</span> {formatShortDate(d.date)}
                </span>
                <span className="flex min-w-0 flex-1 flex-wrap gap-x-4 gap-y-0.5 text-[13px]">
                  <span>
                    Recovery{" "}
                    <span className={cn("font-semibold tabular-nums", zone && ZONE_STYLE[zone].text)}>{d.recovery === null ? "—" : `${d.recovery}%`}</span>
                  </span>
                  <span>
                    Sleep <span className="font-semibold tabular-nums">{d.sleep === null ? "—" : `${d.sleep}%`}</span>
                  </span>
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-xs" aria-label={`Actions for ${formatShortDate(d.date)}`}>
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem onSelect={() => onEdit(d.date)}>
                      <Pencil />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => {
                        const removed = actions.deleteWhoopDay(d.date);
                        if (removed)
                          toast("Day deleted", { description: formatShortDate(removed.date), action: { label: "Undo", onClick: () => actions.restoreWhoopDay(removed) } });
                      }}
                      className="text-rose-700 focus:text-rose-800"
                    >
                      <Trash2 className="text-rose-500" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            );
          })}
        </ul>
      </Card>
      {days.length > shown && (
        <Button variant="outline" size="sm" className="self-start" onClick={() => setShown((n) => n + 30)}>
          Show more days
        </Button>
      )}
    </section>
  );
}
