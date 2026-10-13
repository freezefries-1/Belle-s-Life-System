"use client";

import Link from "next/link";
import { ArrowRight, CircleCheck, Sprout, Star, Timer } from "lucide-react";

import { SectionHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { startOfWeek } from "@/lib/date";
import { getWeekSummary } from "@/lib/review/weekly";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn, formatMinutes } from "@/lib/utils";

/** This week at a glance — four numbers, no charts. Details live on Weekly Review and Progress. */
export function WeeklyProgress({ className }: { className?: string }) {
  const { workspace } = useWorkspace();
  const week = startOfWeek(workspace.today);
  const s = getWeekSummary(workspace, week);
  const stats = [
    { label: "Tasks completed", value: String(s.completed.length), icon: CircleCheck, tone: "text-emerald-600" },
    { label: "Highlights", value: s.highlightsSet ? `${s.highlightsCompleted}/${s.highlightsSet}` : "—", icon: Star, tone: "text-amber-500" },
    { label: "Commitments", value: s.commitments.percent === null ? "—" : `${s.commitments.percent}%`, icon: Sprout, tone: "text-primary" },
    { label: "Focused work", value: formatMinutes(s.focus.totalMinutes), icon: Timer, tone: "text-violet-600" },
  ];
  return (
    <Card className={cn("p-5", className)}>
      <SectionHeader title={<span id="weekly-progress-heading">This week</span>} description="Monday to today." />
      <dl className="mt-4 grid grid-cols-2 gap-2.5" aria-labelledby="weekly-progress-heading">
        {stats.map((x) => (
          <div key={x.label} className="rounded-lg bg-muted/60 px-3 py-2.5">
            <dt className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              <x.icon className={cn("size-3.5", x.tone)} />
              {x.label}
            </dt>
            <dd className="mt-1 text-lg font-bold tracking-tight tabular-nums">{x.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex items-center justify-between gap-2 text-xs">
        <Link href={`/weekly-review?week=${week}`} className="inline-flex items-center gap-1 font-semibold text-primary hover:text-primary-strong">
          View Weekly Review
          <ArrowRight className="size-3.5" />
        </Link>
        <Link href="/progress" className="font-semibold text-muted-foreground hover:text-foreground">
          Progress
        </Link>
      </div>
    </Card>
  );
}
