"use client";

import * as React from "react";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { niceTicks, TrendChart, WinLossChart } from "@/components/analytics/trend-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatLongDate, formatShortDate } from "@/lib/date";
import { stageIndex, type Ladder } from "@/lib/students/ladder";
import {
  MATCH_KIND_LABELS,
  benchmarkSeries,
  chartValue,
  formatBenchmark,
  matchRecord,
  matchesByMonth,
  matchesOf,
  percent,
  type BenchmarkSeries,
} from "@/lib/students/performance";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";
import type { Student, StudentBenchmark, StudentMatch, StudentStage, TrackId } from "@/types";

import { BenchmarkDialog } from "./benchmark-dialog";
import { MatchDialog } from "./match-dialog";

/* ---------------- benchmarks ---------------- */

function changeText(s: BenchmarkSeries) {
  if (s.improvement === null) return "First result";
  const since = `since ${formatShortDate(s.first.measuredOn)}`;
  if (Math.abs(s.improvement) < 1e-9) return `No change ${since}`;
  const amount = Math.abs(s.improvement);
  const n = Number.isInteger(amount) ? String(amount) : amount.toFixed(1);
  const better = s.improvement > 0;
  switch (s.unit) {
    case "out_of_10":
      return `${better ? "Up" : "Down"} ${Math.round(amount * 10)} points ${since}`;
    case "balls":
      return `${better ? "+" : "−"}${n} ${amount === 1 ? "ball" : "balls"} ${since}`;
    case "seconds":
      return `${n} s ${better ? "faster" : "slower"} ${since}`;
    default:
      return `${better ? "Better" : "Worse"} by ${n} ${since}`;
  }
}

export function BenchmarksSection({ student }: { student: Student }) {
  const { workspace, actions } = useWorkspace();
  const series = benchmarkSeries(workspace.studentBenchmarks, student.id);
  const [dialog, setDialog] = React.useState<{ result?: StudentBenchmark; test?: string } | null>(null);

  function remove(r: StudentBenchmark) {
    const removed = actions.deleteBenchmark(r.id);
    if (removed)
      toast("Result deleted", {
        description: `${removed.name}: ${formatBenchmark(removed.unit, removed.value)}`,
        action: { label: "Undo", onClick: () => actions.restoreBenchmark(removed) },
      });
  }

  return (
    <section aria-labelledby="benchmarks-heading" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 id="benchmarks-heading" className="text-base font-semibold">
          Benchmarks
        </h3>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setDialog({})}>
          <Plus className="size-3.5" />
          Record result
        </Button>
      </div>
      {series.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-card/60 px-4 py-6 text-center text-[13px] text-muted-foreground">
          No results yet. Repeat a quick test every few weeks (rally count, serves out of 10) to see progress in numbers.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {series.map((s) => (
            <BenchmarkCard key={s.test} series={s} onRecord={() => setDialog({ test: s.test })} onEdit={(r) => setDialog({ result: r })} onDelete={remove} />
          ))}
        </div>
      )}
      {dialog && (
        <BenchmarkDialog student={student} result={dialog.result} initialTest={dialog.test} open={!!dialog} onOpenChange={(o) => !o && setDialog(null)} />
      )}
    </section>
  );
}

function BenchmarkCard({
  series: s,
  onRecord,
  onEdit,
  onDelete,
}: {
  series: BenchmarkSeries;
  onRecord: () => void;
  onEdit: (r: StudentBenchmark) => void;
  onDelete: (r: StudentBenchmark) => void;
}) {
  const values = s.results.map((r) => chartValue(s.unit, r.value));
  const scale = s.unit === "out_of_10" ? { top: 100, ticks: [0, 50, 100] } : niceTicks(Math.max(...values) * 1.1);
  return (
    <Card role="group" className="gap-3 p-4 sm:p-5" aria-label={s.name}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold">{s.name}</p>
          <p className="mt-1 text-[22px] leading-tight font-bold">{formatBenchmark(s.unit, s.latest.value)}</p>
          <p className="text-xs text-muted-foreground">
            Latest, {formatShortDate(s.latest.measuredOn)} · Best {formatBenchmark(s.unit, s.best.value)}
          </p>
          <p className={cn("mt-0.5 text-xs font-semibold", s.improvement && s.improvement > 0 ? "text-emerald-700" : "text-muted-foreground")}>{changeText(s)}</p>
        </div>
        <Button variant="ghost" size="sm" className="shrink-0 gap-1" onClick={onRecord} aria-label={`Record a result for ${s.name}`}>
          <Plus className="size-3.5" />
          Add
        </Button>
      </div>
      {s.results.length > 1 && (
        <TrendChart
          label={`${s.name}: ${s.results.length} results from ${formatShortDate(s.first.measuredOn)} to ${formatShortDate(s.latest.measuredOn)}, latest ${formatBenchmark(s.unit, s.latest.value)}, best ${formatBenchmark(s.unit, s.best.value)}`}
          points={s.results.map((r) => ({ key: r.id, date: r.measuredOn, value: chartValue(s.unit, r.value), display: formatBenchmark(s.unit, r.value) }))}
          yMax={scale.top}
          ticks={scale.ticks}
          formatTick={(v) => (s.unit === "out_of_10" ? `${v}%` : String(v))}
          highlightKey={s.best.id}
          highlightLabel="Best"
        />
      )}
      <details className="text-xs">
        <summary className="cursor-pointer font-semibold text-muted-foreground hover:text-foreground">All results ({s.results.length})</summary>
        <table className="mt-2 w-full">
          <thead className="sr-only">
            <tr>
              <th>Date</th>
              <th>Result</th>
              <th>Note</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {[...s.results].reverse().map((r) => (
              <tr key={r.id} className="border-t">
                <td className="py-1 pr-2 whitespace-nowrap text-muted-foreground tabular-nums">{formatShortDate(r.measuredOn)}</td>
                <td className="py-1 pr-2 font-semibold whitespace-nowrap">{formatBenchmark(r.unit, r.value)}</td>
                <td className="w-full py-1 pr-2 text-muted-foreground">{r.note}</td>
                <td className="py-1 text-right">
                  <RowMenu label={`Actions for ${s.name} on ${formatShortDate(r.measuredOn)}`} onEdit={() => onEdit(r)} onDelete={() => onDelete(r)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </Card>
  );
}

function RowMenu({ label, onEdit, onDelete }: { label: string; onEdit: () => void; onDelete: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-xs" aria-label={label}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onDelete} className="text-rose-700 focus:text-rose-800">
          <Trash2 className="text-rose-500" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ---------------- matches ---------------- */

function statLine(m: StudentMatch) {
  const first = percent(m.firstIn, m.firstTotal);
  const second = percent(m.secondIn, m.secondTotal);
  return [
    first !== null && `1st serves ${first}% (${m.firstIn}/${m.firstTotal})`,
    second !== null && `2nd serves ${second}% (${m.secondIn}/${m.secondTotal})`,
    m.doubleFaults !== null && `${m.doubleFaults} double ${m.doubleFaults === 1 ? "fault" : "faults"}`,
    m.unforcedErrors !== null && `${m.unforcedErrors} unforced ${m.unforcedErrors === 1 ? "error" : "errors"}`,
    m.winners !== null && `${m.winners} ${m.winners === 1 ? "winner" : "winners"}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

function ResultChip({ result, className }: { result: "win" | "loss"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold",
        result === "win" ? "bg-primary text-white" : "bg-orange-600 text-white",
        className,
      )}
      title={result === "win" ? "Win" : "Loss"}
    >
      {result === "win" ? "W" : "L"}
    </span>
  );
}

export function MatchesSection({ student }: { student: Student }) {
  const { workspace, actions } = useWorkspace();
  const matches = matchesOf(workspace.studentMatches, student.id);
  const record = matchRecord(matches, workspace.today);
  const months = matchesByMonth(matches, workspace.today);
  const [dialog, setDialog] = React.useState<{ match?: StudentMatch } | null>(null);
  const [showAll, setShowAll] = React.useState(false);
  const withServe = matches.filter((m) => m.firstIn !== null && m.firstTotal !== null);
  const firstServe = percent(
    withServe.reduce((n, m) => n + (m.firstIn ?? 0), 0),
    withServe.reduce((n, m) => n + (m.firstTotal ?? 0), 0),
  );
  const shown = showAll ? matches : matches.slice(0, 8);

  function remove(m: StudentMatch) {
    const removed = actions.deleteMatch(m.id);
    if (removed)
      toast("Match deleted", { description: `${formatShortDate(removed.playedOn)} · ${removed.score}`, action: { label: "Undo", onClick: () => actions.restoreMatch(removed) } });
  }

  return (
    <section aria-labelledby="matches-heading" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 id="matches-heading" className="text-base font-semibold">
          Matches
        </h3>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setDialog({})}>
          <Plus className="size-3.5" />
          Add match
        </Button>
      </div>
      {matches.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-card/60 px-4 py-6 text-center text-[13px] text-muted-foreground">
          No matches yet. For students who compete, add results here to see their record and form.
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Tile label={`This year (${workspace.today.slice(0, 4)})`} value={`${record.thisYear.wins}–${record.thisYear.losses}`} note="Won–lost" />
            <Tile label="Win rate" value={record.all.winRate === null ? "—" : `${record.all.winRate}%`} note={`${record.all.wins} of ${record.all.played} matches`} />
            <Tile
              label="First serves in"
              value={firstServe === null ? "—" : `${firstServe}%`}
              note={withServe.length ? `Across ${withServe.length} ${withServe.length === 1 ? "match" : "matches"} with counts` : "Add serve counts to a match"}
            />
            <div className="rounded-xl border bg-card px-3.5 py-3">
              <dt className="text-xs text-muted-foreground">Recent form</dt>
              <dd className="mt-1.5 flex gap-1" aria-label={`Last ${record.form.length}, oldest first: ${record.form.map((m) => (m.result === "win" ? "win" : "loss")).join(", ")}`}>
                {record.form.map((m) => (
                  <ResultChip key={m.id} result={m.result} />
                ))}
              </dd>
            </div>
          </dl>
          {months.some((m) => m.wins + m.losses > 0) && (
            <Card className="p-4 sm:p-5">
              <p className="mb-2 text-[13px] font-semibold">Results by month</p>
              <WinLossChart months={months} />
            </Card>
          )}
          <Card className="overflow-hidden">
            <ul className="divide-y" aria-label="Matches">
              {shown.map((m) => {
                const stats = statLine(m);
                return (
                  <li key={m.id} className="flex items-start gap-3 px-4 py-3 text-[13px] sm:px-5">
                    <ResultChip result={m.result} className="mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="font-semibold">{m.result === "win" ? "Won" : "Lost"}</span>
                        {m.score && <span className="font-semibold tabular-nums">{m.score}</span>}
                        {m.opponent && <span className="text-muted-foreground">vs {m.opponent}</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatLongDate(m.playedOn)} · {m.event || MATCH_KIND_LABELS[m.kind]}
                        {m.event && <Badge variant="secondary" className="ml-1.5 align-middle">{MATCH_KIND_LABELS[m.kind]}</Badge>}
                      </p>
                      {stats && <p className="mt-0.5 text-xs">{stats}</p>}
                      {m.notes && <p className="mt-0.5 text-xs whitespace-pre-line text-muted-foreground">{m.notes}</p>}
                    </div>
                    <RowMenu label={`Actions for the match on ${formatShortDate(m.playedOn)}`} onEdit={() => setDialog({ match: m })} onDelete={() => remove(m)} />
                  </li>
                );
              })}
            </ul>
            {matches.length > shown.length && (
              <button type="button" className="w-full border-t py-2 text-xs font-semibold text-primary hover:bg-muted/40" onClick={() => setShowAll(true)}>
                Show all {matches.length} matches
              </button>
            )}
          </Card>
        </>
      )}
      {dialog && <MatchDialog student={student} match={dialog.match} open={!!dialog} onOpenChange={(o) => !o && setDialog(null)} />}
    </section>
  );
}

function Tile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border bg-card px-3.5 py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-[20px] leading-tight font-bold">{value}</dd>
      <dd className="text-[11px] text-muted-foreground">{note}</dd>
    </div>
  );
}

/* ---------------- stage timeline ---------------- */

/** A staircase per track (Rally, Serve): when each stage was reached, carried on to today. */
export function StageTimeline({ ladder, stages, today }: { ladder: Ladder; stages: StudentStage[]; today: string }) {
  const tracks: TrackId[] = ["rally", "serve"];
  const shown = tracks
    .map((t) => ({
      track: ladder[t],
      entries: stages
        .filter((s) => s.track === t && stageIndex(ladder, t, s.stage) >= 0)
        .sort((a, b) => a.reachedOn.localeCompare(b.reachedOn) || stageIndex(ladder, t, a.stage) - stageIndex(ladder, t, b.stage)),
    }))
    .filter((x) => x.entries.length > 0);
  if (shown.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {shown.map(({ track, entries }) => {
        const n = track.stages.length;
        const every = Math.ceil(n / 4);
        const ticks = Array.from({ length: n }, (_, i) => i).filter((i) => i % every === 0 || i === n - 1);
        const last = entries.at(-1)!;
        return (
          <Card key={track.id} className="p-4">
            <p className="text-[13px] font-semibold">{track.name} stages over time</p>
            <TrendChart
              label={`${track.name}: ${entries.map((e) => `${e.stage} on ${formatShortDate(e.reachedOn)}`).join(", ")}`}
              points={entries.map((e) => ({ key: e.id, date: e.reachedOn, value: stageIndex(ladder, track.id, e.stage), display: e.stage }))}
              yMax={n - 1}
              ticks={ticks}
              formatTick={(v) => track.stages[v]?.id ?? ""}
              step
              extendTo={today}
              highlightKey={last.id}
              highlightLabel={last.stage}
              height={120}
            />
          </Card>
        );
      })}
    </div>
  );
}
