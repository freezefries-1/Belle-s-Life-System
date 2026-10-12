"use client";

import { CalendarClock, CircleCheck, Sprout, Star } from "lucide-react";

import { SectionHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getCommitmentProgress } from "@/lib/daily/commitments";
import { resolveHighlight } from "@/lib/daily/day";
import { useWorkspace } from "@/lib/store/workspace-store";
import { getDailyProgress } from "@/lib/tasks/task-queries";
import { cn } from "@/lib/utils";

/**
 * Four separate signals — tasks, highlight, commitments, what's still due.
 * They're deliberately not blended into one score.
 */
export function DailyProgress({ className }: { className?: string }) {
  const { workspace } = useWorkspace();
  const tasks = getDailyProgress(workspace.tasks, workspace.today);
  const highlight = resolveHighlight(workspace, workspace.today);
  const commitments = getCommitmentProgress(workspace.commitments, workspace.today, workspace.commitmentCompletions);

  const stats = [
    { label: "Tasks completed", value: String(tasks.completedToday), icon: CircleCheck, tone: "text-emerald-600" },
    {
      label: "Highlight",
      value: highlight ? (highlight.completed ? "Done" : "In focus") : "Not set",
      icon: Star,
      tone: cn("text-amber-500", highlight?.completed && "fill-amber-400"),
    },
    {
      label: "Commitments",
      value: commitments.scheduled ? `${commitments.done}/${commitments.scheduled}` : "—",
      icon: Sprout,
      tone: "text-primary",
    },
    { label: "Still due today", value: String(tasks.activeDueToday), icon: CalendarClock, tone: "text-amber-600" },
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
      {tasks.planned > 0 && (
        <>
          <Progress
            value={tasks.percent}
            className="mt-4"
            indicatorClassName="bg-emerald-500"
            aria-label={`${tasks.completedToday} of ${tasks.planned} of today’s tasks complete`}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Today’s tasks: {tasks.completedToday} of {tasks.planned} done (due today, plus anything finished today).
          </p>
        </>
      )}
    </Card>
  );
}
