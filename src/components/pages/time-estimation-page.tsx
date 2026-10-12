"use client";

import { Gauge, Timer, TrendingUp } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SprintBadge } from "@/components/shared/sprint-badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SPRINTS } from "@/data/sprints";
import { localDateOf, relativeDayLabel } from "@/lib/date";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn, formatMinutes } from "@/lib/utils";

export function TimeEstimationPage() {
  const { workspace } = useWorkspace();
  const rows = workspace.tasks
    .filter((t) => t.status === "completed" && t.estimatedMinutes != null && t.actualMinutes != null)
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));

  if (rows.length === 0) {
    return (
      <>
        <PageHeader
          title="Time Estimation"
          description="Compare what you expected with what actually happened. Not to judge — just to plan more kindly."
        />
        <Card>
          <EmptyState
            icon={Timer}
            title="Nothing to compare yet"
            description="When you complete a task, open it and add the actual time next to your estimate. Comparisons appear here."
            className="py-14"
          />
        </Card>
      </>
    );
  }

  const totalEst = rows.reduce((s, t) => s + t.estimatedMinutes!, 0);
  const totalAct = rows.reduce((s, t) => s + t.actualMinutes!, 0);
  const ratio = totalEst ? totalAct / totalEst : 1;
  const withinRange = rows.filter((t) => Math.abs(t.actualMinutes! - t.estimatedMinutes!) / t.estimatedMinutes! <= 0.2).length;
  const maxMinutes = Math.max(...rows.map((t) => Math.max(t.estimatedMinutes!, t.actualMinutes!)), 1);

  const bySprint = SPRINTS.map((s) => {
    const r = rows.filter((t) => t.sprint === s.id);
    const est = r.reduce((sum, t) => sum + t.estimatedMinutes!, 0);
    const act = r.reduce((sum, t) => sum + t.actualMinutes!, 0);
    return { sprint: s, count: r.length, ratio: est ? act / est : null };
  });
  const biggest = bySprint.filter((s) => s.ratio).sort((a, b) => b.ratio! - a.ratio!)[0];

  return (
    <>
      <PageHeader
        title="Time Estimation"
        description="Compare what you expected with what actually happened. Not to judge — just to plan more kindly."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-muted-foreground">
            <Gauge className="size-4" />
            Overall
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums">×{ratio.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">
            Tasks take about {Math.round(Math.abs(ratio - 1) * 100)}% {ratio >= 1 ? "longer" : "less"} than planned
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-[13px] font-semibold text-muted-foreground">Close estimates</p>
          <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums">
            {withinRange}/{rows.length}
          </p>
          <p className="text-xs text-muted-foreground">within 20% of the estimate</p>
        </Card>
        <Card className="p-5">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-muted-foreground">
            <TrendingUp className="size-4" />
            Insight
          </p>
          {biggest && (
            <p className="mt-2 text-[13px] leading-relaxed">
              <span className="font-semibold">{biggest.sprint.name}</span> tasks run about ×{biggest.ratio!.toFixed(1)}{" "}
              your estimate. Try adding a buffer when planning them.
            </p>
          )}
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3">
          <h3 className="text-base font-semibold">Recently completed</h3>
          <div className="flex items-center gap-3 text-[11px] font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-4 rounded-full bg-slate-300" /> Estimate
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-4 rounded-full bg-primary" /> Actual
            </span>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Task</TableHead>
              <TableHead className="hidden md:table-cell">Sprint</TableHead>
              <TableHead className="text-right">Estimate</TableHead>
              <TableHead className="text-right">Actual</TableHead>
              <TableHead className="text-right">Difference</TableHead>
              <TableHead className="hidden w-48 pr-5 lg:table-cell">Comparison</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((t) => {
              const diff = t.actualMinutes! - t.estimatedMinutes!;
              const pct = Math.round((diff / t.estimatedMinutes!) * 100);
              return (
                <TableRow key={t.id}>
                  <TableCell className="max-w-[260px] pl-5 whitespace-normal">
                    <p className="font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{relativeDayLabel(localDateOf(t.completedAt!), workspace.today)}</p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <SprintBadge sprintId={t.sprint} />
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">{formatMinutes(t.estimatedMinutes)}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatMinutes(t.actualMinutes)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-xs font-semibold",
                        Math.abs(pct) <= 20 ? "bg-emerald-50 text-emerald-700" : diff > 0 ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700",
                      )}
                    >
                      {diff === 0 ? "Spot on" : `${diff > 0 ? "+" : "−"}${formatMinutes(Math.abs(diff))}`}
                    </span>
                  </TableCell>
                  <TableCell className="hidden pr-5 lg:table-cell">
                    <div className="flex flex-col gap-1">
                      <span className="h-1.5 rounded-full bg-slate-300" style={{ width: `${(t.estimatedMinutes! / maxMinutes) * 100}%` }} />
                      <span className="h-1.5 rounded-full bg-primary" style={{ width: `${(t.actualMinutes! / maxMinutes) * 100}%` }} />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
