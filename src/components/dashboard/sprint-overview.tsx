"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { SectionHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { SPRINTS, SPRINT_STYLES } from "@/data/sprints";
import { getSprintStats } from "@/lib/selectors";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";
import type { Sprint } from "@/types";

export function SprintOverview({ className }: { className?: string }) {
  return (
    <section className={cn("flex flex-col gap-4", className)} aria-labelledby="sprints-heading">
      <SectionHeader
        title={<span id="sprints-heading">Sprints</span>}
        description="Four kinds of work. Start with whichever fits your energy."
        action={
          <Link href="/sprints" className="text-xs font-semibold text-primary hover:text-primary-hover">
            Open board
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {SPRINTS.map((sprint) => (
          <SprintCard key={sprint.id} sprint={sprint} />
        ))}
      </div>
    </section>
  );
}

function SprintCard({ sprint }: { sprint: Sprint }) {
  const { workspace, actions } = useWorkspace();
  const { open, doneToday, total, percent } = getSprintStats(workspace, sprint.id);
  const style = SPRINT_STYLES[sprint.id];
  const preview = [...open, ...doneToday].slice(0, 3);

  return (
    <Card className={cn("group overflow-hidden border-t-[3px] p-5", style.border)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("text-[11px] font-bold tracking-[0.08em] uppercase", style.text)}>Sprint {sprint.number}</p>
          <h4 className="mt-0.5 text-[15px] font-semibold tracking-tight">{sprint.name}</h4>
          <p className="mt-0.5 text-xs text-muted-foreground">{sprint.description}</p>
        </div>
        <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
          {open.length} open
        </span>
      </div>

      <ul className="mt-3 flex flex-1 flex-col">
        {preview.length === 0 && <li className="py-3 text-[13px] text-muted-foreground">All clear here.</li>}
        {preview.map((task) => {
          const done = task.status === "done";
          return (
            <li key={task.id} className="flex items-start gap-2.5 py-1.5">
              <Checkbox
                checked={done}
                onCheckedChange={() => actions.toggleTask(task.id)}
                aria-label={`Toggle “${task.title}”`}
                className="mt-px size-4 rounded-[4px]"
              />
              <span
                className={cn(
                  "line-clamp-1 text-[13px] leading-snug",
                  done && "text-muted-foreground line-through decoration-slate-300",
                )}
              >
                {task.title}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex items-center gap-3">
        <Progress
          value={percent}
          className="flex-1"
          indicatorClassName={style.bar}
          aria-label={`${sprint.name}: ${doneToday.length} of ${total} done today`}
        />
        <span className="text-[11px] font-medium whitespace-nowrap text-muted-foreground tabular-nums">
          {doneToday.length}/{total} today
        </span>
      </div>
      <Link
        href={`/sprints#${sprint.id}`}
        className="mt-3 inline-flex items-center gap-1 self-start text-xs font-semibold text-primary hover:text-primary-hover"
      >
        View all
        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </Card>
  );
}
