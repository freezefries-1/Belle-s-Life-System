"use client";

import * as React from "react";
import { CalendarClock, CheckCircle2 } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { AREA_STYLES } from "@/components/shared/project-card";
import { ProgressRing } from "@/components/shared/progress-ring";
import { TaskItem } from "@/components/tasks/task-item";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatShortDate, relativeDayPhrase } from "@/lib/date";
import { getProjectStats } from "@/lib/selectors";
import { isActive } from "@/lib/tasks/task-model";
import { sortTasks } from "@/lib/tasks/task-queries";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";
import type { Project } from "@/types";

export function ProjectsPage() {
  const { workspace } = useWorkspace();
  const [filter, setFilter] = React.useState<"active" | "all">("active");
  const projects = workspace.projects.filter((p) => filter === "all" || p.status === "active");

  return (
    <>
      <PageHeader
        title="Projects"
        description="The bigger outcomes your daily sprints add up to."
        actions={
          <Button variant="outline" disabled title="Creating projects arrives in a later phase">
            New project
          </Button>
        }
      />
      <Tabs value={filter} onValueChange={(v) => setFilter(v as "active" | "all")} className="mb-5">
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {projects.map((p) => (
          <ProjectPanel key={p.id} project={p} />
        ))}
      </div>
    </>
  );
}

function ProjectPanel({ project }: { project: Project }) {
  const { workspace } = useWorkspace();
  const stats = getProjectStats(workspace, project.id);
  const tasks = workspace.tasks.filter((t) => t.projectId === project.id);
  const open = sortTasks(tasks.filter(isActive), "due");
  const nextDeadline = open
    .map((t) => t.dueDate)
    .filter((d): d is string => !!d)
    .sort()[0];

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-4 p-5">
        <ProgressRing value={stats.percent} size={56} stroke={5} label={`${stats.percent}% complete`}>
          <span className="text-xs font-bold tabular-nums">{stats.percent}%</span>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-semibold", AREA_STYLES[project.area])}>
            {project.area}
          </span>
          <h3 className="mt-1.5 text-[17px] font-semibold tracking-tight">{project.name}</h3>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{project.description}</p>
        </div>
      </div>

      <dl className="grid grid-cols-3 border-y bg-muted/30 text-center">
        <div className="px-3 py-2.5">
          <dt className="text-[11px] font-semibold text-muted-foreground">Open</dt>
          <dd className="text-[15px] font-bold tabular-nums">{stats.outstanding}</dd>
        </div>
        <div className="border-x px-3 py-2.5">
          <dt className="text-[11px] font-semibold text-muted-foreground">Done</dt>
          <dd className="text-[15px] font-bold tabular-nums">{stats.done}</dd>
        </div>
        <div className="px-3 py-2.5">
          <dt className="text-[11px] font-semibold text-muted-foreground">Target</dt>
          <dd className="text-[15px] font-bold">{project.targetDate ? formatShortDate(project.targetDate) : "Ongoing"}</dd>
        </div>
      </dl>

      <div className="p-3">
        <div className="flex items-center justify-between px-2 pb-1">
          <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Next up</p>
          {nextDeadline && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarClock className="size-3" />
              Next deadline {relativeDayPhrase(nextDeadline, workspace.today)}
            </span>
          )}
        </div>
        {open.length === 0 ? (
          <p className="flex items-center gap-2 px-2 py-4 text-[13px] text-muted-foreground">
            <CheckCircle2 className="size-4 text-emerald-600" />
            Nothing open — nicely done.
          </p>
        ) : (
          open.slice(0, 4).map((t) => <TaskItem key={t.id} task={t} showDescription={false} />)
        )}
        {open.length > 4 && <p className="px-2 pt-1 text-xs text-muted-foreground">+ {open.length - 4} more in Tasks</p>}
      </div>
    </Card>
  );
}
