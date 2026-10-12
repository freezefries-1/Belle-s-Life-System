"use client";

import Link from "next/link";
import { ArrowUpRight, CalendarClock } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatShortDate, relativeDayPhrase } from "@/lib/date";
import { getProjectProgress } from "@/lib/projects/project-model";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";
import type { Project } from "@/types";

import { COLOUR_STYLES, DeadlineChip, ProjectGlyph, ProjectStatusBadge } from "./project-visuals";

export function ProjectCard({ project, compact = false, className }: { project: Project; compact?: boolean; className?: string }) {
  const { workspace } = useWorkspace();
  const progress = getProjectProgress(workspace.tasks, workspace.milestones, project.id, workspace.today);
  const href = `/projects/${project.id}`;
  const done = project.status === "completed";

  return (
    <Card className={cn("group gap-3.5 p-5 transition-colors hover:border-slate-300", className)}>
      <div className="flex items-start gap-3">
        <ProjectGlyph project={project} />
        <div className="min-w-0 flex-1">
          <Link href={href} className="block rounded text-[15px] leading-snug font-semibold tracking-tight hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none">
            {project.name}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <ProjectStatusBadge status={project.status} />
            {project.category && <span className="text-[11px] text-muted-foreground">{project.category}</span>}
          </div>
        </div>
        <span className="text-xs font-semibold text-foreground tabular-nums">{progress.percent === null ? "" : `${progress.percent}%`}</span>
      </div>

      {!compact && project.description && <p className="line-clamp-2 text-[13px] text-muted-foreground">{project.description}</p>}

      {progress.percent === null ? (
        <p className="text-[11px] text-subtle-foreground">No tasks yet</p>
      ) : (
        <Progress value={progress.percent} indicatorClassName={COLOUR_STYLES[project.colour].bar} aria-label={`${project.name} ${progress.percent}% complete`} />
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>
          <span className="font-semibold text-foreground tabular-nums">{progress.active}</span> active
        </span>
        <span>
          <span className="font-semibold text-foreground tabular-nums">{progress.completed}</span> done
        </span>
        {project.targetDate && (
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="size-3" />
            {formatShortDate(project.targetDate)}
            <DeadlineChip date={project.targetDate} today={workspace.today} done={done} showDays={false} />
          </span>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">
          {progress.nextDeadline ? <>Next: {relativeDayPhrase(progress.nextDeadline, workspace.today)}</> : "No upcoming deadlines"}
        </span>
        <Link href={href} className="inline-flex items-center gap-0.5 font-semibold text-primary hover:text-primary-hover">
          Open
          <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-px group-hover:-translate-y-px" />
        </Link>
      </div>
    </Card>
  );
}
