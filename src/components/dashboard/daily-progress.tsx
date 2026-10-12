"use client";

import { CircleCheck, CircleDot, Sprout, Star } from "lucide-react";

import { SectionHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { getHighlightTask, getTodayTasks, isCommitmentDone } from "@/lib/selectors";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";

export function DailyProgress({ className }: { className?: string }) {
  const { workspace } = useWorkspace();
  const tasks = getTodayTasks(workspace);
  const completed = tasks.filter((t) => t.status === "done").length;
  const outstanding = tasks.length - completed;
  const commitmentsDone = workspace.commitments.filter((c) => isCommitmentDone(c, workspace.today)).length;
  const highlight = getHighlightTask(workspace);
  const highlightDone = highlight?.status === "done";

  const stats = [
    { label: "Completed", value: String(completed), icon: CircleCheck, tone: "text-emerald-600" },
    { label: "Still open", value: String(outstanding), icon: CircleDot, tone: "text-muted-foreground" },
    {
      label: "Commitments",
      value: `${commitmentsDone}/${workspace.commitments.length}`,
      icon: Sprout,
      tone: "text-primary",
    },
    {
      label: "Highlight",
      value: highlight ? (highlightDone ? "Done" : "In focus") : "Not set",
      icon: Star,
      tone: highlightDone ? "text-amber-500" : "text-muted-foreground",
    },
  ];

  return (
    <Card className={cn("p-5", className)}>
      <SectionHeader title="Daily progress" description="A snapshot, not a scorecard." />
      <dl className="mt-4 grid grid-cols-2 gap-2.5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg bg-muted/60 px-3 py-2.5">
            <dt className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              <s.icon className={cn("size-3.5", s.tone, s.label === "Highlight" && highlightDone && "fill-amber-400")} />
              {s.label}
            </dt>
            <dd className="mt-1 text-lg font-bold tracking-tight tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
