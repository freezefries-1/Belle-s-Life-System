"use client";

import * as React from "react";
import Link from "next/link";
import { ListOrdered, MoreHorizontal, Pencil, Plus, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { niceTicks, TrendChart } from "@/components/analytics/trend-chart";
import { StudentView } from "@/components/pages/student-page";
import { PageHeader } from "@/components/shared/page-header";
import { BenchmarkDialog } from "@/components/students/benchmark-dialog";
import { RatingDialog } from "@/components/students/rating-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatShortDate } from "@/lib/date";
import { selfProfile } from "@/lib/store/changes/students";
import { useWorkspace } from "@/lib/store/workspace-store";
import { focusNext, formatBenchmark, formatRating, nextLevel, ratingHistory } from "@/lib/students/performance";
import { cn } from "@/lib/utils";
import type { MatchFormat, Student, StudentRating } from "@/types";

/** My Pickleball: your own progress — DUPR, what to focus on next, and the same tracks, benchmarks and matches as a student. */
export function PickleballPage() {
  const { workspace } = useWorkspace();
  const me = selfProfile(workspace, "pickleball");
  if (!me) return <SetUp />;
  return (
    <StudentView
      student={me}
      header={
        <>
          <PageHeader
            title="My Pickleball"
            description="Your DUPR, what to work on next, and your progress on each part of the game. Private to you."
            actions={
              <Button asChild variant="outline" className="gap-1.5">
                <Link href="/pickleball/ladder">
                  <ListOrdered className="size-4" />
                  Edit my ladder
                </Link>
              </Button>
            }
            className="mb-0 lg:mb-0"
          />
          <Ratings student={me} />
          <FocusNext student={me} />
        </>
      }
    />
  );
}

function SetUp() {
  const { actions } = useWorkspace();
  const [doubles, setDoubles] = React.useState("");
  const [singles, setSingles] = React.useState("");
  const parse = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));
  const d = parse(doubles);
  const s = parse(singles);
  const bad = [d, s].some((x) => x !== null && (!Number.isFinite(x) || x < 1 || x > 9));
  return (
    <>
      <PageHeader title="My Pickleball" description="Track your own pickleball: DUPR, skills on each part of the game, benchmarks, matches and partners." />
      <Card className="max-w-xl p-5 sm:p-6">
        <h3 className="text-[15px] font-semibold">Set up My Pickleball</h3>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Add your current DUPR ratings to start your history (you can skip either and add them later). Everything here is private to your account.
        </p>
        <form
          className="mt-4 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (bad) return;
            if (actions.setUpMyPickleball({ doubles: d, singles: s })) toast("My Pickleball is ready");
          }}
        >
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="setup-doubles">DUPR doubles</Label>
              <Input id="setup-doubles" inputMode="decimal" value={doubles} onChange={(e) => setDoubles(e.target.value)} placeholder="e.g. 4.1" className="w-32" autoComplete="off" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="setup-singles">DUPR singles</Label>
              <Input id="setup-singles" inputMode="decimal" value={singles} onChange={(e) => setSingles(e.target.value)} placeholder="Optional" className="w-32" autoComplete="off" />
            </div>
          </div>
          {bad && (
            <p role="alert" className="text-xs text-rose-700">
              DUPR ratings are between 1 and 9, e.g. 4.123.
            </p>
          )}
          <Button type="submit" className="self-start" disabled={bad}>
            Start tracking
          </Button>
        </form>
      </Card>
    </>
  );
}

function Ratings({ student }: { student: Student }) {
  const { workspace, actions } = useWorkspace();
  // The dialog stays mounted after closing so focus goes back to the button that opened it.
  const [dialog, setDialogState] = React.useState<{ kind: MatchFormat; rating?: StudentRating; n: number } | null>(null);
  const [open, setOpen] = React.useState(false);
  const setDialog = (d: { kind: MatchFormat; rating?: StudentRating }) => {
    setDialogState((prev) => ({ ...d, n: (prev?.n ?? 0) + 1 }));
    setOpen(true);
  };

  function remove(r: StudentRating) {
    const removed = actions.deleteRating(r.id);
    if (removed)
      toast("Rating deleted", { description: `${removed.kind} ${formatRating(removed.rating)}`, action: { label: "Undo", onClick: () => actions.restoreRating(removed) } });
  }

  return (
    <section aria-labelledby="dupr-heading" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 id="dupr-heading" className="text-base font-semibold">
          DUPR
        </h3>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setDialog({ kind: "doubles" })}>
          <Plus className="size-3.5" />
          Add rating
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {(["doubles", "singles"] as const).map((kind) => {
          const history = ratingHistory(workspace.studentRatings, student.id, kind);
          const latest = history.at(-1);
          const first = history[0];
          const change = latest && first && history.length > 1 ? latest.rating - first.rating : null;
          const lo = history.length ? Math.floor(Math.min(...history.map((r) => r.rating)) * 2) / 2 - 0.5 : 3;
          const hi = Math.max(5, ...history.map((r) => r.rating));
          const top = Math.ceil(hi * 2) / 2;
          const span = niceTicks(top - Math.max(1, lo));
          const base = Math.max(1, lo);
          return (
            <Card key={kind} className="gap-3 p-4 sm:p-5" role="group" aria-label={`DUPR ${kind}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] font-semibold capitalize">{kind}</p>
                  {latest ? (
                    <>
                      <p className="mt-1 text-[26px] leading-tight font-bold">{formatRating(latest.rating)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatShortDate(latest.ratedOn)}
                        {change !== null && (
                          <span className={cn("ml-1.5 font-semibold", change > 0 ? "text-emerald-700" : "text-muted-foreground")}>
                            {change > 0 ? "+" : change < 0 ? "−" : "±"}
                            {Math.abs(change).toFixed(3)} since {formatShortDate(first.ratedOn)}
                          </span>
                        )}
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 text-[13px] text-muted-foreground">No {kind} rating yet.</p>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="gap-1" onClick={() => setDialog({ kind })} aria-label={`Add a ${kind} rating`}>
                  <Plus className="size-3.5" />
                  Add
                </Button>
              </div>
              {history.length > 1 && (
                <TrendChart
                  label={`DUPR ${kind}: ${history.map((r) => `${formatShortDate(r.ratedOn)} ${formatRating(r.rating)}`).join(", ")}`}
                  points={history.map((r) => ({ key: r.id, date: r.ratedOn, value: r.rating, display: formatRating(r.rating) }))}
                  yMin={base}
                  yMax={base + span.top}
                  ticks={span.ticks.map((t) => Math.round((base + t) * 100) / 100)}
                  formatTick={(v) => v.toFixed(1)}
                  height={120}
                />
              )}
              {history.length > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer font-semibold text-muted-foreground hover:text-foreground">All {kind} ratings ({history.length})</summary>
                  <ul className="mt-2 divide-y">
                    {[...history].reverse().map((r) => (
                      <li key={r.id} className="flex items-center gap-2 py-1">
                        <span className="w-14 shrink-0 text-muted-foreground tabular-nums">{formatShortDate(r.ratedOn)}</span>
                        <span className="font-semibold tabular-nums">{formatRating(r.rating)}</span>
                        <span className="min-w-0 flex-1 truncate text-muted-foreground">{r.note}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-xs" aria-label={`Actions for ${kind} rating on ${formatShortDate(r.ratedOn)}`}>
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36">
                            <DropdownMenuItem onSelect={() => setDialog({ kind, rating: r })}>
                              <Pencil />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => remove(r)} className="text-rose-700 focus:text-rose-800">
                              <Trash2 className="text-rose-500" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </Card>
          );
        })}
      </div>
      {dialog && (
        <RatingDialog key={dialog.n} student={student} rating={dialog.rating} initialKind={dialog.kind} open={open} onOpenChange={setOpen} />
      )}
    </section>
  );
}

function FocusNext({ student }: { student: Student }) {
  const { workspace } = useWorkspace();
  const [record, setRecord] = React.useState<string | null>(null);
  const doubles = ratingHistory(workspace.studentRatings, student.id, "doubles").at(-1)?.rating ?? null;
  const level = nextLevel(doubles);
  const items = focusNext(workspace.studentBenchmarks, student.id, level);
  const gaps = items.filter((i) => i.gap !== null).slice(0, 2);
  const unmeasured = items.filter((i) => i.gap === null);
  return (
    <Card className="gap-3 p-4 sm:p-5" role="group" aria-labelledby="focus-heading">
      <div className="flex items-start gap-3">
        <Target className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <h3 id="focus-heading" className="text-[15px] font-semibold">
            Focus next: towards {level.toFixed(1)}
          </h3>
          <p className="text-xs text-muted-foreground">
            Your latest benchmark results against suggested {level.toFixed(1)} targets — the biggest gaps first. Targets are a starting point; your matches’
            “how points were lost” tallies are worth checking too.
          </p>
        </div>
      </div>
      {gaps.length === 0 && unmeasured.length === 0 ? (
        <p className="text-[13px] font-semibold text-emerald-700">Every benchmark is at the {level.toFixed(1)} target. Keep testing to make sure it holds.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {gaps.map((i, n) => (
            <li key={i.test.test} className="rounded-lg bg-muted/40 px-3 py-2 text-[13px]">
              <span className="font-semibold">
                {n + 1}. {i.test.name}
              </span>
              <span className="block text-xs text-muted-foreground">
                Latest {formatBenchmark(i.test.unit, i.latest!.value)} ({formatShortDate(i.latest!.measuredOn)}) · target {formatBenchmark(i.test.unit, i.target)}
              </span>
            </li>
          ))}
          {unmeasured.length > 0 && (
            <li className="text-xs text-muted-foreground">
              Not measured yet:{" "}
              {unmeasured.map((i, n) => (
                <React.Fragment key={i.test.test}>
                  {n > 0 && ", "}
                  <button type="button" className="font-semibold text-primary underline-offset-2 hover:underline" onClick={() => setRecord(i.test.test)}>
                    {i.test.name}
                  </button>
                </React.Fragment>
              ))}
              . Test them to see where you stand.
            </li>
          )}
        </ol>
      )}
      {record && <BenchmarkDialog student={student} initialTest={record} open={!!record} onOpenChange={(o) => !o && setRecord(null)} />}
    </Card>
  );
}
