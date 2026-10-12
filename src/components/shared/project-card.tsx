"use client";

import Link from "next/link";
import { ArrowUpRight, CalendarClock } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { relativeDayLabel } from "@/lib/date";
import { getProjectStats } from "@/lib/selectors";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";
import type { Project } from "@/types";

export const AREA_STYLES: Record<Project["area"], string> = {
  Business: "bg-blue-50 text-blue-700",
  "Tennis Ladder": "bg-amber-50 text-amber-700",
  Coaching: "bg-teal-50 text-teal-700",
  Personal: "bg-violet-50 text-violet-700",
};

export function ProjectCard({ project, className }: { project: Project; className?: string }) {
  const { workspace } = useWorkspace();
  const stats = getProjectStats(workspace, project.id);

  return (
    <Card className={cn("group gap-4 p-5 transition-colors hover:border-slate-300", className)}>
      <div className="flex items-start justify-between gap-3">
        <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-semibold", AREA_STYLES[project.area])}>
          {project.area}
        </span>
        <span className="text-xs font-semibold text-foreground tabular-nums">{stats.percent}%</span>
      </div>

      <div className="min-w-0">
        <h4 className="text-[15px] font-semibold tracking-tight">{project.name}</h4>
        <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground">{project.description}</p>
      </div>

      <Progress value={stats.percent} aria-label={`${project.name} progress`} />

      <div className="mt-auto flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>
            <span className="font-semibold text-foreground tabular-nums">{stats.outstanding}</span> open
          </span>
          {project.targetDate ? (
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="size-3" />
              {relativeDayLabel(project.targetDate, workspace.today)}
            </span>
          ) : (
            <span>Ongoing</span>
          )}
        </div>
        <Link
          href="/projects"
          className="inline-flex items-center gap-0.5 rounded font-semibold text-primary hover:text-primary-hover focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
        >
          Open
          <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-px group-hover:-translate-y-px" />
        </Link>
      </div>
    </Card>
  );
}
