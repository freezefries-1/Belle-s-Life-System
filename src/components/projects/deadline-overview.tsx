"use client";

import Link from "next/link";
import { CalendarClock, Flag, Hourglass, Target } from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatShortDate, formatWeekday, relativeDayLabel } from "@/lib/date";
import { DEADLINE_LABEL, getDeadlineItems, type DeadlineItem } from "@/lib/projects/project-model";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";

const KIND = {
  project: { label: "Project deadline", icon: Target },
  milestone: { label: "Milestone", icon: Flag },
  "project-prep": { label: "Start preparing", icon: Hourglass },
  "milestone-prep": { label: "Start preparing", icon: Hourglass },
} as const;

/**
 * Upcoming project deadlines, milestones and preparation dates (derived,
 * never stored). Preparation reminders are labelled so they never read as
 * a deadline.
 */
export function DeadlineOverview({ limit = 8, horizonDays = 30, className, title = "Upcoming deadlines" }: { limit?: number; horizonDays?: number; className?: string; title?: string }) {
  const { workspace } = useWorkspace();
  const items = getDeadlineItems(workspace.projects, workspace.milestones, workspace.today, horizonDays);
  const shown = items.slice(0, limit);

  return (
    <Card className={cn("p-5", className)}>
      <h3 className="flex items-center gap-2 text-[15px] font-semibold">
        <CalendarClock className="size-4 text-muted-foreground" />
        {title}
      </h3>
      <p className="mt-0.5 text-xs text-muted-foreground">Next {horizonDays} days across your projects.</p>
      {shown.length === 0 ? (
        <p className="mt-4 text-[13px] text-muted-foreground">Nothing on the horizon. Add target dates to projects or milestones to see them here.</p>
      ) : (
        <ul className="mt-3 flex flex-col divide-y" aria-label={title}>
          {shown.map((item) => (
            <DeadlineRow key={item.key} item={item} today={workspace.today} />
          ))}
        </ul>
      )}
      {items.length > shown.length && <p className="mt-2 text-xs text-muted-foreground">+ {items.length - shown.length} more on the Calendar</p>}
    </Card>
  );
}

function DeadlineRow({ item, today }: { item: DeadlineItem; today: string }) {
  const kind = KIND[item.kind];
  const href = `/projects/${item.projectId}${item.milestoneId ? `#milestone-${item.milestoneId}` : ""}`;
  const prepActive = item.isPreparation && item.date <= today;
  const tone = item.isPreparation
    ? "text-primary"
    : item.status === "overdue"
      ? "text-rose-600"
      : item.status === "due_today" || item.status === "approaching"
        ? "text-amber-700"
        : "text-muted-foreground";

  return (
    <li>
      <Link href={href} className="flex items-center gap-3 py-2.5 hover:bg-muted/40 focus-visible:bg-muted focus-visible:outline-none">
        <span className="flex size-9 shrink-0 flex-col items-center justify-center rounded-lg bg-muted leading-none">
          <span className="text-[9px] font-semibold text-muted-foreground uppercase">{formatWeekday(item.date)}</span>
          <span className="text-[13px] font-bold">{formatShortDate(item.date).split(" ")[0]}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold">{item.title}</span>
          <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <span className={cn("inline-flex items-center gap-1 font-medium", tone)}>
              <kind.icon className="size-3" />
              {kind.label}
            </span>
            {item.kind !== "project" && <span className="truncate">{item.projectName}</span>}
          </span>
        </span>
        <span className={cn("shrink-0 text-right text-[11px] font-semibold", tone)}>
          {item.isPreparation ? (prepActive ? "Now" : relativeDayLabel(item.date, today)) : item.status === "upcoming" ? relativeDayLabel(item.date, today) : DEADLINE_LABEL[item.status]}
        </span>
      </Link>
    </li>
  );
}
