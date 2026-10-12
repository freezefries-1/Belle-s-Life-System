"use client";

import Link from "next/link";
import { CircleCheck, Flag, Lightbulb, ListPlus, ListTodo, Sprout, Star, Timer } from "lucide-react";

import { StatTile } from "@/components/analytics/stat-tile";
import { ProjectGlyph } from "@/components/projects/project-visuals";
import { SprintDot } from "@/components/shared/sprint-badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { sprintLabel } from "@/data/sprints";
import { formatShortDate, formatWeekday, localDateOf } from "@/lib/date";
import { getProjectProgress } from "@/lib/projects/project-model";
import { getWeeklyInsights, type WeekSummary } from "@/lib/review/weekly";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn, formatMinutes } from "@/lib/utils";

import { UnfinishedReview } from "./unfinished-review";

export function LookBack({ summary }: { summary: WeekSummary }) {
  const { workspace } = useWorkspace();
  const insights = getWeeklyInsights(summary, sprintLabel);
  const c = summary.commitments;
  const activeProjects = workspace.projects.filter((p) => p.status === "active");

  return (
    <div className="flex flex-col gap-5">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4" aria-label="Week in numbers">
        <StatTile icon={CircleCheck} label="Tasks completed" value={summary.completed.length} />
        <StatTile icon={ListPlus} label="Tasks created" value={summary.created.length} />
        <StatTile icon={ListTodo} label="Still open at week end" value={summary.unfinished.length} note={summary.isPast ? "Due by Sunday" : "So far"} />
        <StatTile icon={Star} label="Highlights completed" value={`${summary.highlightsCompleted} / ${summary.highlightsSet}`} note={summary.highlightsSet ? "of days with a highlight" : "None chosen"} />
        <StatTile
          icon={Sprout}
          label="Commitments"
          value={c.scheduled ? `${c.done} / ${c.scheduled}` : "—"}
          note={c.percent !== null ? `${c.percent}% of scheduled` : "Nothing scheduled"}
        />
        <StatTile icon={Timer} label="Focused work" value={formatMinutes(summary.focus.totalMinutes)} note={`${summary.focus.count} ${summary.focus.count === 1 ? "session" : "sessions"}`} />
        <StatTile icon={Flag} label="Milestones reached" value={summary.milestones.length} />
      </dl>

      {insights.length > 0 && (
        <Card className="p-5">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold">
            <Lightbulb className="size-4 text-muted-foreground" />
            This week in a sentence or two
          </h3>
          <ul className="mt-2 flex flex-col gap-1.5 text-[13px]" aria-label="Weekly insights">
            {insights.map((i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-[7px] size-1 shrink-0 rounded-full bg-primary" />
                {i}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="text-[15px] font-semibold">Completed tasks</h3>
          {summary.completed.length === 0 ? (
            <p className="mt-3 text-[13px] text-muted-foreground">No tasks were completed this week.</p>
          ) : (
            <ul className="mt-3 flex max-h-72 flex-col gap-2 overflow-y-auto pr-1" aria-label="Completed tasks">
              {[...summary.completed]
                .sort((a, b) => a.completedAt!.localeCompare(b.completedAt!))
                .map((t) => (
                  <li key={t.id} className="flex items-center gap-2 text-[13px]">
                    <SprintDot sprintId={t.sprint} className="size-1.5" />
                    <span className="min-w-0 flex-1 truncate">{t.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatWeekday(localDateOf(t.completedAt!))}</span>
                  </li>
                ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-[15px] font-semibold">Daily Highlights</h3>
          <ul className="mt-3 flex flex-col gap-2" aria-label="Daily Highlights">
            {summary.highlights.map((h) => (
              <li key={h.date} className="flex items-center gap-3 text-[13px]">
                <span className="w-16 shrink-0 text-xs font-semibold text-muted-foreground">
                  {formatWeekday(h.date)} {formatShortDate(h.date).split(" ")[0]}
                </span>
                {h.title ? (
                  <>
                    <Star className={cn("size-3.5 shrink-0", h.completed ? "fill-amber-400 text-amber-400" : "text-slate-300")} />
                    <span className={cn("min-w-0 flex-1 truncate", !h.completed && "text-muted-foreground")}>{h.title}</span>
                    {h.completed && <span className="shrink-0 text-[11px] font-semibold text-emerald-700">Done</span>}
                  </>
                ) : (
                  <span className="text-xs text-subtle-foreground">—</span>
                )}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <h3 className="text-[15px] font-semibold">Micro-commitment consistency</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Counted against scheduled days only. Paused days don’t count.</p>
          {c.rows.length === 0 ? (
            <p className="mt-3 text-[13px] text-muted-foreground">Nothing was scheduled this week.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3" aria-label="Commitment consistency">
              {c.rows.map((r) => (
                <li key={r.commitment.id}>
                  <div className="flex items-center justify-between gap-3 text-[13px]">
                    <span className="min-w-0 truncate font-medium">{r.commitment.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {r.done} of {r.scheduled}
                    </span>
                  </div>
                  <Progress value={r.percent ?? 0} className="mt-1 h-1.5" aria-label={`${r.commitment.title}: ${r.done} of ${r.scheduled}`} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-[15px] font-semibold">Project progress</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Current progress — past snapshots aren’t stored.</p>
          {activeProjects.length === 0 ? (
            <p className="mt-3 text-[13px] text-muted-foreground">No active projects.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3" aria-label="Project progress">
              {activeProjects.map((p) => {
                const prog = getProjectProgress(workspace.tasks, workspace.milestones, p.id, workspace.today);
                const doneThisWeek = summary.completed.filter((t) => t.projectId === p.id).length;
                return (
                  <li key={p.id} className="flex items-center gap-3">
                    <ProjectGlyph project={p} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 text-[13px]">
                        <Link href={`/projects/${p.id}`} className="truncate font-medium hover:text-primary">
                          {p.name}
                        </Link>
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{prog.percent === null ? "No tasks" : `${prog.percent}%`}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {doneThisWeek} done this week · {prog.remaining} remaining
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {summary.milestones.length > 0 && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Flag className="size-3" />
              Reached: {summary.milestones.map((m) => m.title).join(", ")}
            </p>
          )}
        </Card>
      </div>

      <UnfinishedReview summary={summary} />
    </div>
  );
}
