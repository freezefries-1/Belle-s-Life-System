"use client";

import Link from "next/link";
import { CircleCheck, NotebookPen, Sprout, Star } from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatShortDate, formatWeekday, relativeDayLabel } from "@/lib/date";
import { getActiveDays, summarizeDay } from "@/lib/daily/day";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";
import type { ISODate } from "@/types";

/** Chronological overview of recent days. Click one to open its log. */
export function DayHistory({ selected }: { selected: ISODate }) {
  const { workspace } = useWorkspace();
  const days = getActiveDays(workspace, 30).map((d) => summarizeDay(workspace, d));

  return (
    <Card className="overflow-hidden">
      <div className="border-b px-4 py-3">
        <h3 className="text-[15px] font-semibold">Recent days</h3>
        <p className="text-xs text-muted-foreground">Days with something recorded.</p>
      </div>
      <ul className="max-h-[560px] divide-y overflow-y-auto" aria-label="Recent days">
        {days.map((day) => {
          const h = day.highlight;
          return (
            <li key={day.date}>
              <Link
                href={`/kaizen-log?date=${day.date}`}
                aria-current={day.date === selected ? "date" : undefined}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50 focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-inset",
                  day.date === selected && "bg-accent/60 hover:bg-accent/70",
                )}
              >
                <span className="flex size-9 shrink-0 flex-col items-center justify-center rounded-lg bg-muted leading-none">
                  <span className="text-[9px] font-semibold text-muted-foreground uppercase">{formatWeekday(day.date)}</span>
                  <span className="text-[13px] font-bold">{formatShortDate(day.date).split(" ")[0]}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold">{relativeDayLabel(day.date, workspace.today)}</span>
                  <span className="block truncate text-xs text-muted-foreground">{h ? h.title : "No highlight"}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2.5 text-[11px] text-muted-foreground tabular-nums">
                  <Star
                    className={cn("size-3.5", h ? (h.completed ? "fill-amber-400 text-amber-400" : "text-amber-400") : "text-slate-200")}
                    aria-label={h ? (h.completed ? "Highlight completed" : "Highlight not completed") : "No highlight"}
                  />
                  <span className="inline-flex items-center gap-0.5" aria-label={`${day.tasksCompleted} tasks completed`}>
                    <CircleCheck className="size-3" />
                    {day.tasksCompleted}
                  </span>
                  <span className="inline-flex items-center gap-0.5" aria-label={`${day.commitmentsDone} commitments completed`}>
                    <Sprout className="size-3" />
                    {day.commitmentsDone}
                  </span>
                  <NotebookPen
                    className={cn("size-3.5", day.reflection || day.notes ? "text-primary" : "text-slate-200")}
                    aria-label={day.reflection || day.notes ? "Reflection or notes written" : "No reflection"}
                  />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
