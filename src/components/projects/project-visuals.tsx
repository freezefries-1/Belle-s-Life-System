import {
  BookOpen,
  Briefcase,
  Dumbbell,
  Folder,
  Heart,
  House,
  Sparkles,
  Trophy,
  type LucideIcon,
} from "lucide-react";

import { DEADLINE_LABEL, MILESTONE_STATUS_LABEL, PROJECT_STATUS_LABEL, daysRemainingLabel, deadlineStatus, type DeadlineStatus } from "@/lib/projects/project-model";
import { cn } from "@/lib/utils";
import type { ISODate, MilestoneStatus, Project, ProjectColour, ProjectIcon, ProjectStatus } from "@/types";

export const PROJECT_ICON_COMPONENTS: Record<ProjectIcon, LucideIcon> = {
  folder: Folder,
  briefcase: Briefcase,
  trophy: Trophy,
  house: House,
  heart: Heart,
  sparkles: Sparkles,
  book: BookOpen,
  dumbbell: Dumbbell,
};

export const COLOUR_STYLES: Record<ProjectColour, { dot: string; tint: string; text: string; bar: string }> = {
  blue: { dot: "bg-blue-500", tint: "bg-blue-50", text: "text-blue-700", bar: "bg-blue-500" },
  teal: { dot: "bg-teal-500", tint: "bg-teal-50", text: "text-teal-700", bar: "bg-teal-500" },
  amber: { dot: "bg-amber-500", tint: "bg-amber-50", text: "text-amber-700", bar: "bg-amber-500" },
  violet: { dot: "bg-violet-500", tint: "bg-violet-50", text: "text-violet-700", bar: "bg-violet-500" },
  rose: { dot: "bg-rose-500", tint: "bg-rose-50", text: "text-rose-700", bar: "bg-rose-500" },
  slate: { dot: "bg-slate-500", tint: "bg-slate-100", text: "text-slate-700", bar: "bg-slate-500" },
};

export function ProjectGlyph({ project, size = "md" }: { project: Pick<Project, "icon" | "colour">; size?: "sm" | "md" | "lg" }) {
  const Icon = PROJECT_ICON_COMPONENTS[project.icon];
  const style = COLOUR_STYLES[project.colour];
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg",
        style.tint,
        size === "sm" ? "size-6" : size === "lg" ? "size-11 rounded-xl" : "size-8",
      )}
      aria-hidden
    >
      <Icon className={cn(style.text, size === "sm" ? "size-3.5" : size === "lg" ? "size-5" : "size-4")} />
    </span>
  );
}

const STATUS_TONE: Record<ProjectStatus, string> = {
  active: "bg-accent text-accent-foreground",
  planning: "bg-violet-50 text-violet-700",
  on_hold: "bg-amber-50 text-amber-700",
  completed: "bg-emerald-50 text-emerald-700",
  archived: "bg-slate-100 text-slate-500",
};

export function ProjectStatusBadge({ status, className }: { status: ProjectStatus; className?: string }) {
  return (
    <span className={cn("inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap", STATUS_TONE[status], className)}>
      {PROJECT_STATUS_LABEL[status]}
    </span>
  );
}

const MILESTONE_TONE: Record<MilestoneStatus, string> = {
  upcoming: "bg-muted text-muted-foreground",
  in_progress: "bg-accent text-accent-foreground",
  completed: "bg-emerald-50 text-emerald-700",
};

export function MilestoneStatusBadge({ status }: { status: MilestoneStatus }) {
  return (
    <span className={cn("inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap", MILESTONE_TONE[status])}>
      {MILESTONE_STATUS_LABEL[status]}
    </span>
  );
}

const DEADLINE_TONE: Record<DeadlineStatus, string> = {
  upcoming: "text-muted-foreground",
  approaching: "text-amber-700",
  due_today: "text-amber-700 font-semibold",
  overdue: "text-rose-600 font-semibold",
  completed: "text-emerald-700",
};

/** "Approaching · in 5 days" — calm wording, colour only as a hint. */
export function DeadlineChip({
  date,
  today,
  done = false,
  showDays = true,
  className,
}: {
  date: ISODate;
  today: ISODate;
  done?: boolean;
  showDays?: boolean;
  className?: string;
}) {
  const status = deadlineStatus(date, today, done);
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs whitespace-nowrap", DEADLINE_TONE[status], className)}>
      <span>{DEADLINE_LABEL[status]}</span>
      {showDays && status !== "completed" && status !== "due_today" && (
        <span className="font-normal text-muted-foreground">· {daysRemainingLabel(date, today)}</span>
      )}
    </span>
  );
}
