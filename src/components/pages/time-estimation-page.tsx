"use client";

import * as React from "react";
import { Lightbulb, Scale, Timer, TrendingUp } from "lucide-react";

import { NotEnoughData } from "@/components/analytics/bar-chart";
import { StatTile } from "@/components/analytics/stat-tile";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SprintBadge } from "@/components/shared/sprint-badge";
import { useTaskEditor } from "@/components/tasks/task-editor-provider";
import { AllocateSessionDialog } from "@/components/time/allocate-session-dialog";
import { MinutesInput } from "@/components/time/minutes-input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SPRINT_BY_ID } from "@/data/sprints";
import {
  MIN_RECORDS_FOR_INSIGHT,
  accuracyOf,
  allocatedMinutes,
  formatSigned,
  getEstimationInsights,
  getEstimationStats,
  getTimeRecords,
  sessionMinutes,
  type TimeRecord,
} from "@/lib/analytics/time";
import { formatShortDate, localDateOf } from "@/lib/date";
import { getSessionHistory } from "@/lib/selectors";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn, formatMinutes } from "@/lib/utils";
import type { SprintSession } from "@/types";

const ACCURACY = {
  on_target: { label: "On target", className: "bg-emerald-50 text-emerald-700" },
  longer: { label: "Took longer", className: "bg-amber-50 text-amber-800" },
  quicker: { label: "Quicker", className: "bg-blue-50 text-blue-700" },
};

const fmt = (n: number | null) => (n === null ? "—" : `${formatSigned(Math.round(n))} min`);

export function TimeEstimationPage() {
  const { workspace } = useWorkspace();
  const [filter, setFilter] = React.useState<"all" | "paired" | "missing">("all");
  const records = getTimeRecords(workspace.tasks);
  const stats = getEstimationStats(records);
  const insights = getEstimationInsights(records, (id) => SPRINT_BY_ID[id].name);
  const shown = records.filter((r) =>
    filter === "paired" ? r.difference !== null : filter === "missing" ? r.estimated !== null && r.actual === null : true,
  );

  return (
    <>
      <PageHeader
        title="Time Estimation"
        description="Compare what you expected with what actually happened — not to judge, just to plan more realistically."
      />

      <dl className="mb-2 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5" aria-label="Estimation accuracy">
        <StatTile icon={Scale} label="Average difference" value={fmt(stats.averageDifference)} note={`${stats.count} ${stats.count === 1 ? "task" : "tasks"} with both times`} />
        <StatTile label="Median difference" value={fmt(stats.medianDifference)} note={`${stats.count} tasks`} />
        <StatTile
          icon={TrendingUp}
          label="Took longer than estimated"
          value={stats.percentOver === null ? "—" : `${stats.percentOver}%`}
          note={stats.count ? `${stats.overCount} of ${stats.count} tasks` : "No paired tasks yet"}
        />
        <StatTile label="Average estimate" value={stats.averageEstimated === null ? "—" : formatMinutes(Math.round(stats.averageEstimated))} note={`${stats.count} tasks`} />
        <StatTile label="Average actual" value={stats.averageActual === null ? "—" : formatMinutes(Math.round(stats.averageActual))} note={`${stats.count} tasks`} />
      </dl>
      <p className="mb-6 text-xs text-muted-foreground">
        Difference = actual − estimated. Only tasks with both times are compared; a missing time is never treated as zero.
        {stats.estimateOnly > 0 && ` ${stats.estimateOnly} completed ${stats.estimateOnly === 1 ? "task has" : "tasks have"} an estimate but no actual time yet.`}
      </p>

      <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="p-5">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold">
            <Lightbulb className="size-4 text-muted-foreground" />
            Planning patterns
          </h3>
          {insights.length ? (
            <ul className="mt-3 flex flex-col gap-2 text-[13px]" aria-label="Estimation insights">
              {insights.map((i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-[7px] size-1 shrink-0 rounded-full bg-primary" />
                  {i}
                </li>
              ))}
            </ul>
          ) : (
            <NotEnoughData className="mt-3" />
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">Patterns appear once at least {MIN_RECORDS_FOR_INSIGHT} comparable tasks are recorded (per Sprint for Sprint patterns).</p>
        </Card>
        <SessionAllocations />
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
          <div>
            <h3 className="text-base font-semibold">Time Estimation Log</h3>
            <p className="text-xs text-muted-foreground">Completed tasks with an estimate or actual time. Edit the numbers right here.</p>
          </div>
          <div className="inline-flex rounded-lg border bg-card p-0.5" role="group" aria-label="Filter log">
            {(
              [
                { id: "all", label: "All" },
                { id: "paired", label: "Compared" },
                { id: "missing", label: "Missing actual" },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold",
                  filter === f.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        {records.length === 0 ? (
          <EmptyState
            icon={Timer}
            title="Nothing to compare yet"
            description="Add an estimate when you create a task, then record the actual time when it’s done (here, in the task editor, or from a focus session)."
            className="py-14"
          />
        ) : shown.length === 0 ? (
          <p className="px-5 py-8 text-center text-[13px] text-muted-foreground">No tasks in this view.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table aria-label="Time Estimation Log">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">Task</TableHead>
                  <TableHead className="hidden md:table-cell">Sprint</TableHead>
                  <TableHead className="hidden lg:table-cell">Project</TableHead>
                  <TableHead className="hidden sm:table-cell">Completed</TableHead>
                  <TableHead className="text-right">Estimated</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Difference</TableHead>
                  <TableHead className="hidden pr-5 md:table-cell">Accuracy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((r) => (
                  <LogRow key={r.task.id} record={r} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </>
  );
}

function LogRow({ record: r }: { record: TimeRecord }) {
  const { workspace, actions } = useWorkspace();
  const editor = useTaskEditor();
  const project = r.task.projectId ? workspace.projects.find((p) => p.id === r.task.projectId) : null;
  const acc = accuracyOf(r);
  return (
    <TableRow>
      <TableCell className="max-w-[240px] pl-5 whitespace-normal">
        <button type="button" onClick={() => editor.openEdit(r.task.id)} className="cursor-pointer text-left font-medium hover:text-primary">
          {r.task.title}
        </button>
        <p className="text-xs text-muted-foreground sm:hidden">{r.completedOn ? formatShortDate(r.completedOn) : ""}</p>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <SprintBadge sprintId={r.task.sprint} />
      </TableCell>
      <TableCell className="hidden max-w-[160px] truncate text-xs text-muted-foreground lg:table-cell">{project?.name ?? "—"}</TableCell>
      <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">{r.completedOn ? formatShortDate(r.completedOn) : "—"}</TableCell>
      <TableCell className="text-right">
        <MinutesInput label={`Estimated minutes for “${r.task.title}”`} value={r.estimated} onSave={(v) => actions.updateTask(r.task.id, { estimatedMinutes: v })} className="ml-auto" />
      </TableCell>
      <TableCell className="text-right">
        <MinutesInput label={`Actual minutes for “${r.task.title}”`} value={r.actual} onSave={(v) => actions.updateTask(r.task.id, { actualMinutes: v })} className="ml-auto" />
      </TableCell>
      <TableCell className="text-right text-xs font-semibold tabular-nums">{r.difference === null ? <span className="text-subtle-foreground">—</span> : `${formatSigned(r.difference)} min`}</TableCell>
      <TableCell className="hidden pr-5 md:table-cell">
        {acc ? (
          <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap", ACCURACY[acc].className)}>
            {ACCURACY[acc].label}
            {r.ratio !== null && acc !== "on_target" && ` · ${r.ratio}%`}
          </span>
        ) : (
          <span className="text-xs text-subtle-foreground">Needs both times</span>
        )}
      </TableCell>
    </TableRow>
  );
}

/** Recent finished sessions, with how much of each one has been given to tasks. */
function SessionAllocations() {
  const { workspace } = useWorkspace();
  const [active, setActive] = React.useState<SprintSession | null>(null);
  const sessions = getSessionHistory(workspace)
    .filter((s) => s.taskIds.length > 0 && s.accumulatedElapsedSeconds >= 60)
    .slice(0, 6);
  return (
    <Card className="p-5">
      <h3 className="flex items-center gap-2 text-[15px] font-semibold">
        <Timer className="size-4 text-muted-foreground" />
        Focus session time
      </h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Sessions can cover several tasks, so their time isn’t added to tasks automatically. Allocate it if you’d like it in the log.
      </p>
      {sessions.length === 0 ? (
        <p className="mt-3 text-[13px] text-muted-foreground">No finished sessions with tasks yet.</p>
      ) : (
        <ul className="mt-3 flex flex-col divide-y" aria-label="Recent sessions">
          {sessions.map((s) => {
            const total = sessionMinutes(s);
            const given = allocatedMinutes(s);
            return (
              <li key={s.id} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">
                    {SPRINT_BY_ID[s.sprintId].name} · {formatMinutes(total)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatShortDate(localDateOf(s.endedAt ?? s.createdAt))} · {s.taskIds.length} {s.taskIds.length === 1 ? "task" : "tasks"} ·{" "}
                    {given ? `${given} of ${total} min allocated` : "not allocated"}
                  </p>
                </div>
                <Button variant="outline" size="xs" onClick={() => setActive(s)} aria-label={`Allocate time from ${SPRINT_BY_ID[s.sprintId].name} session on ${formatShortDate(localDateOf(s.endedAt ?? s.createdAt))}`}>
                  {given ? "Edit" : "Allocate"}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      {active && <AllocateSessionDialog session={active} onClose={() => setActive(null)} />}
    </Card>
  );
}
