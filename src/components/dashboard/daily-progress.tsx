"use client";

import { CalendarClock, CircleCheck, CircleDot, Gauge } from "lucide-react";

import { SectionHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useWorkspace } from "@/lib/store/workspace-store";
import { getDailyProgress } from "@/lib/tasks/task-queries";
import { cn } from "@/lib/utils";

export function DailyProgress({ className }: { className?: string }) {
  const { workspace } = useWorkspace();
  const p = getDailyProgress(workspace.tasks, workspace.today);

  const stats = [
    { label: "Completed today", value: String(p.completedToday), icon: CircleCheck, tone: "text-emerald-600" },
    { label: "Due today", value: String(p.activeDueToday), icon: CalendarClock, tone: "text-amber-600" },
    { label: "Outstanding", value: String(p.outstanding), icon: CircleDot, tone: "text-muted-foreground" },
    { label: "Progress", value: p.planned ? `${p.percent}%` : "—", icon: Gauge, tone: "text-primary" },
  ];

  return (
    <Card className={cn("p-5", className)}>
      <SectionHeader title="Daily progress" description="A snapshot, not a scorecard." />
      <dl className="mt-4 grid grid-cols-2 gap-2.5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg bg-muted/60 px-3 py-2.5">
            <dt className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              <s.icon className={cn("size-3.5", s.tone)} />
              {s.label}
            </dt>
            <dd className="mt-1 text-lg font-bold tracking-tight tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>
      <Progress
        value={p.percent}
        className="mt-4"
        indicatorClassName="bg-emerald-500"
        aria-label={`${p.completedToday} of ${p.planned} of today’s tasks complete`}
      />
      <p className="mt-2 text-xs text-muted-foreground">
        {p.planned
          ? `${p.completedToday} of ${p.planned} of today’s tasks done.`
          : "Nothing is due today. Anything you finish still counts."}
      </p>
    </Card>
  );
}
