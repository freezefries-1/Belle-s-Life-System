"use client";

import * as React from "react";
import Link from "next/link";
import { CircleCheck, Flag, FolderKanban, Sprout, Star, Timer } from "lucide-react";

import { BarChart, HBarList, NotEnoughData } from "@/components/analytics/bar-chart";
import { StatTile } from "@/components/analytics/stat-tile";
import { ProjectGlyph } from "@/components/projects/project-visuals";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { SPRINTS, SPRINT_STYLES } from "@/data/sprints";
import { getConsistency, getConsistencyReport } from "@/lib/analytics/consistency";
import { getCompletionTrend, getSprintDistribution } from "@/lib/analytics/progress";
import { getFocusStats, sessionsBetween } from "@/lib/analytics/time";
import { addDays, daysBetween, formatShortDate, formatWeekday, localDateOf, parseISODate, startOfWeek } from "@/lib/date";
import { getProjectProgress } from "@/lib/projects/project-model";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn, formatMinutes } from "@/lib/utils";
import type { ISODate } from "@/types";

type Preset = "7" | "30" | "90" | "custom";
const PRESETS: { id: Preset; label: string }[] = [
  { id: "7", label: "Last 7 days" },
  { id: "30", label: "Last 30 days" },
  { id: "90", label: "Last 90 days" },
  { id: "custom", label: "Custom" },
];

const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

export function ProgressPage() {
  const { workspace } = useWorkspace();
  const { today } = workspace;
  const [preset, setPreset] = React.useState<Preset>("30");
  const [custom, setCustom] = React.useState({ from: addDays(today, -13), to: today });
  const [unit, setUnit] = React.useState<"day" | "week">("day");

  // One range for every metric on the page.
  const range = React.useMemo(() => {
    if (preset !== "custom") return { from: addDays(today, -(Number(preset) - 1)), to: today };
    const from = isDate(custom.from) ? custom.from : today;
    const to = isDate(custom.to) ? (custom.to > today ? today : custom.to) : today;
    return from <= to ? { from, to } : { from: to, to: from };
  }, [preset, custom, today]);
  const days = daysBetween(range.from, range.to) + 1;
  const effectiveUnit = days > 62 && unit === "day" ? "week" : unit;

  const completed = workspace.tasks.filter((t) => t.status === "completed" && t.completedAt && localDateOf(t.completedAt) >= range.from && localDateOf(t.completedAt) <= range.to);
  const highlights = workspace.highlights.filter((h) => h.dateKey >= range.from && h.dateKey <= range.to);
  const highlightsDone = highlights.filter((h) => workspace.tasks.find((t) => t.id === h.taskId)?.status === "completed").length;
  const consistency = getConsistencyReport(workspace.commitments, range.from, range.to, today, workspace.commitmentCompletions);
  const focus = getFocusStats(sessionsBetween(workspace.sessions, range.from, range.to));
  const activeProjects = workspace.projects.filter((p) => p.status === "active");
  const milestones = workspace.milestones.filter((m) => m.status === "completed" && m.completedAt && localDateOf(m.completedAt) >= range.from && localDateOf(m.completedAt) <= range.to);
  const trend = getCompletionTrend(workspace.tasks, range.from, range.to, effectiveUnit);
  const distribution = getSprintDistribution(completed);

  return (
    <>
      <PageHeader title="Progress" description="What you’ve done, where your time went, and how steady your routines have been." />

      <Card className="mb-5 flex-row flex-wrap items-end gap-3 p-4">
        <div className="inline-flex flex-wrap rounded-lg border bg-card p-0.5" role="radiogroup" aria-label="Date range">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={preset === p.id}
              onClick={() => setPreset(p.id)}
              className={cn(
                "cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold",
                preset === p.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === "custom" && (
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="range-from" className="text-xs">
                From
              </Label>
              <Input id="range-from" type="date" max={today} value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} className="h-8 w-40 text-xs" />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="range-to" className="text-xs">
                To
              </Label>
              <Input id="range-to" type="date" max={today} value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} className="h-8 w-40 text-xs" />
            </div>
          </div>
        )}
        <p className="ml-auto text-xs text-muted-foreground" data-testid="range-label">
          {formatShortDate(range.from)} – {formatShortDate(range.to)} · {days} {days === 1 ? "day" : "days"}
        </p>
      </Card>

      <dl className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6" aria-label="Overview">
        <StatTile icon={CircleCheck} label="Tasks completed" value={completed.length} />
        <StatTile icon={Star} label="Highlights completed" value={highlightsDone} note={`of ${highlights.length} chosen`} />
        <StatTile
          icon={Sprout}
          label="Commitments"
          value={consistency.percent === null ? "—" : `${consistency.percent}%`}
          note={consistency.scheduled ? `${consistency.done} of ${consistency.scheduled} scheduled` : "Nothing scheduled"}
        />
        <StatTile icon={Timer} label="Focused work" value={formatMinutes(focus.totalMinutes)} note={`${focus.count} ${focus.count === 1 ? "session" : "sessions"}`} />
        <StatTile icon={FolderKanban} label="Active projects" value={activeProjects.length} note="Right now" />
        <StatTile icon={Flag} label="Milestones reached" value={milestones.length} />
      </dl>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-[15px] font-semibold">Tasks completed over time</h3>
            <div className="inline-flex rounded-lg border bg-card p-0.5" role="radiogroup" aria-label="Group by">
              {(["day", "week"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  role="radio"
                  aria-checked={effectiveUnit === u}
                  disabled={u === "day" && days > 62}
                  onClick={() => setUnit(u)}
                  className={cn(
                    "cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40",
                    effectiveUnit === u ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {u === "day" ? "Daily" : "Weekly"}
                </button>
              ))}
            </div>
          </div>
          {completed.length === 0 ? (
            <p className="mt-6 text-[13px] text-muted-foreground">No completed tasks in this range.</p>
          ) : (
            <BarChart
              className="mt-4"
              unit="tasks completed"
              data={trend.map((b) => ({
                key: b.key,
                label: effectiveUnit === "day" ? (days <= 14 ? formatWeekday(b.key).slice(0, 2) : String(parseISODate(b.key).getDate())) : formatShortDate(b.key),
                title: effectiveUnit === "day" ? formatShortDate(b.key) : `Week of ${formatShortDate(startOfWeek(b.key))}`,
                value: b.count,
                highlight: b.key === today || (effectiveUnit === "week" && b.key === startOfWeek(today)),
              }))}
            />
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-[15px] font-semibold">Completed tasks by Sprint</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Sprints are kinds of work, not stages.</p>
          {distribution.total === 0 ? (
            <p className="mt-4 text-[13px] text-muted-foreground">No completed tasks in this range.</p>
          ) : (
            <div className="mt-4">
              <HBarList
                ariaLabel="Completed tasks by Sprint"
                rows={[
                  ...SPRINTS.map((s) => {
                    const n = distribution.counts.get(s.id) ?? 0;
                    return { key: s.id, label: `Sprint ${s.number} · ${s.name}`, value: n, display: `${n} · ${distribution.percent(n)}%`, barClassName: SPRINT_STYLES[s.id].bar };
                  }),
                  ...((distribution.counts.get(null) ?? 0) > 0
                    ? [{ key: "none", label: "No sprint", value: distribution.counts.get(null)!, display: `${distribution.counts.get(null)} · ${distribution.percent(distribution.counts.get(null)!)}%`, barClassName: "bg-slate-400" }]
                    : []),
                ]}
              />
            </div>
          )}
        </Card>

        <CommitmentConsistency from={range.from} to={range.to} report={consistency} />

        <Card className="p-5">
          <h3 className="text-[15px] font-semibold">Focus sessions</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Time is the actual recorded duration, not the plan.</p>
          {focus.count === 0 ? (
            <p className="mt-4 text-[13px] text-muted-foreground">No finished sessions in this range.</p>
          ) : (
            <>
              <dl className="mt-4 grid grid-cols-3 gap-2" aria-label="Focus summary">
                <div className="rounded-lg bg-muted/60 px-3 py-2">
                  <dt className="text-[11px] font-semibold text-muted-foreground">Total</dt>
                  <dd className="text-base font-bold tabular-nums">{formatMinutes(focus.totalMinutes)}</dd>
                </div>
                <div className="rounded-lg bg-muted/60 px-3 py-2">
                  <dt className="text-[11px] font-semibold text-muted-foreground">Sessions</dt>
                  <dd className="text-base font-bold tabular-nums">{focus.count}</dd>
                </div>
                <div className="rounded-lg bg-muted/60 px-3 py-2">
                  <dt className="text-[11px] font-semibold text-muted-foreground">Average</dt>
                  <dd className="text-base font-bold tabular-nums">{formatMinutes(focus.averageMinutes)}</dd>
                </div>
              </dl>
              <p className="mt-2 text-xs text-muted-foreground">
                Planned {formatMinutes(focus.plannedMinutes)} · actual {formatMinutes(focus.totalMinutes)}
              </p>
              <div className="mt-4">
                <HBarList
                  ariaLabel="Focus time by Sprint"
                  rows={SPRINTS.map((s) => {
                    const minutes = Math.round((focus.bySprint.get(s.id) ?? 0) / 60);
                    return { key: s.id, label: s.name, value: minutes, display: formatMinutes(minutes), barClassName: SPRINT_STYLES[s.id].bar };
                  })}
                />
              </div>
            </>
          )}
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h3 className="text-[15px] font-semibold">Active projects</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Current progress (completed ÷ all tasks). Past progress isn’t stored, so there’s no history chart.</p>
          {activeProjects.length === 0 ? (
            <p className="mt-4 text-[13px] text-muted-foreground">No active projects.</p>
          ) : (
            <ul className="mt-4 grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2" aria-label="Project progress">
              {activeProjects.map((p) => {
                const prog = getProjectProgress(workspace.tasks, workspace.milestones, p.id, today);
                const next = workspace.milestones
                  .filter((m) => m.projectId === p.id && m.status !== "completed")
                  .sort((a, b) => (a.targetDate ?? "9999").localeCompare(b.targetDate ?? "9999") || a.sortOrder - b.sortOrder)[0];
                return (
                  <li key={p.id} className="flex min-w-0 items-start gap-3">
                    <ProjectGlyph project={p} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 text-[13px]">
                        <Link href={`/projects/${p.id}`} className="truncate font-semibold hover:text-primary">
                          {p.name}
                        </Link>
                        <span className="shrink-0 text-xs font-semibold tabular-nums">{prog.percent === null ? "No tasks" : `${prog.percent}%`}</span>
                      </div>
                      <Progress value={prog.percent ?? 0} className="mt-1 h-1.5" aria-label={`${p.name} progress`} />
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {prog.completed} done · {prog.remaining} remaining
                        {p.targetDate && ` · target ${formatShortDate(p.targetDate)}`}
                        {next && ` · next: ${next.title}${next.targetDate ? ` (${formatShortDate(next.targetDate)})` : ""}`}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

function CommitmentConsistency({ from, to, report }: { from: ISODate; to: ISODate; report: ReturnType<typeof getConsistencyReport> }) {
  const { workspace } = useWorkspace();
  // Weekly trend: combined completion % per Monday–Sunday week in the range.
  const weeks: { key: ISODate; percent: number | null; done: number; scheduled: number }[] = [];
  for (let w = startOfWeek(from); w <= to; w = addDays(w, 7)) {
    const wf = w < from ? from : w;
    const wt = addDays(w, 6) > to ? to : addDays(w, 6);
    let scheduled = 0;
    let done = 0;
    for (const c of workspace.commitments) {
      const r = getConsistency(c, wf, wt, workspace.today, workspace.commitmentCompletions);
      scheduled += r.scheduled;
      done += r.done;
    }
    weeks.push({ key: w, scheduled, done, percent: scheduled ? Math.round((done / scheduled) * 100) : null });
  }
  return (
    <Card className="p-5">
      <h3 className="text-[15px] font-semibold">Micro-commitment consistency</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">Based on scheduled days only — unscheduled and paused days never count as missed.</p>
      {report.scheduled === 0 ? (
        <NotEnoughData className="mt-4">Nothing was scheduled in this range.</NotEnoughData>
      ) : (
        <>
          <p className="mt-3 text-[13px]">
            <span className="text-xl font-bold tabular-nums">{report.percent}%</span>{" "}
            <span className="text-muted-foreground">
              · {report.done} of {report.scheduled} scheduled opportunities
            </span>
          </p>
          <ul className="mt-3 flex flex-col gap-2.5" aria-label="Consistency by commitment">
            {report.rows.map((r) => (
              <li key={r.commitment.id}>
                <div className="flex items-center justify-between gap-3 text-[13px]">
                  <span className="min-w-0 truncate">{r.commitment.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {r.done}/{r.scheduled} · {r.percent}%
                  </span>
                </div>
                <Progress value={r.percent ?? 0} className="mt-1 h-1.5" aria-label={`${r.commitment.title} consistency`} />
              </li>
            ))}
          </ul>
          {weeks.filter((w) => w.percent !== null).length > 1 && (
            <div className="mt-4">
              <p className="mb-1 text-[11px] font-semibold text-muted-foreground">Recent weeks</p>
              <BarChart
                height={70}
                unit="% of scheduled"
                data={weeks.filter((w) => w.percent !== null).map((w) => ({
                  key: w.key,
                  label: formatShortDate(w.key),
                  title: `Week of ${formatShortDate(w.key)} (${w.done} of ${w.scheduled})`,
                  value: w.percent ?? 0,
                }))}
              />
            </div>
          )}
        </>
      )}
    </Card>
  );
}
