"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Archive, ArchiveRestore, ArrowLeft, CalendarClock, Hourglass, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DeleteProjectDialog } from "@/components/projects/delete-project-dialog";
import { MilestoneList } from "@/components/projects/milestone-list";
import { ProjectEditorDialog } from "@/components/projects/project-editor-dialog";
import { ProjectNotes } from "@/components/projects/project-notes";
import { ProjectTaskList } from "@/components/projects/project-task-list";
import { DeadlineChip, ProjectGlyph, ProjectStatusBadge } from "@/components/projects/project-visuals";
import { ProgressRing } from "@/components/shared/progress-ring";
import { PriorityIndicator } from "@/components/tasks/priority-indicator";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatLongDate, formatShortDate } from "@/lib/date";
import { PROJECT_STATUSES, getProjectProgress } from "@/lib/projects/project-model";
import { useWorkspace } from "@/lib/store/workspace-store";

export function ProjectWorkspacePage() {
  const { workspace, actions } = useWorkspace();
  const params = useParams<{ id: string }>();
  const project = workspace.projects.find((p) => p.id === params.id);
  const [editing, setEditing] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  // Follow #milestone-… links from deadlines and the calendar.
  React.useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView({ block: "center" });
  }, []);

  if (!project) {
    return (
      <div className="flex flex-col items-start gap-4">
        <h2 className="text-2xl font-bold">Project not found</h2>
        <p className="text-[13px] text-muted-foreground">It may have been deleted. Its tasks, if any, are still in your task list.</p>
        <Button asChild variant="outline">
          <Link href="/projects">Back to Projects</Link>
        </Button>
      </div>
    );
  }

  const progress = getProjectProgress(workspace.tasks, workspace.milestones, project.id, workspace.today);
  const done = project.status === "completed";

  return (
    <div className="flex flex-col gap-5">
      <Link href="/projects" className="inline-flex items-center gap-1.5 self-start text-xs font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" />
        All projects
      </Link>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <ProjectGlyph project={project} size="lg" />
            <div className="min-w-0">
              <h2 className="text-[24px] leading-tight font-bold tracking-tight lg:text-[28px]">{project.name}</h2>
              {project.description && <p className="mt-1 max-w-2xl text-[14px] text-muted-foreground">{project.description}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
                <DropdownMenu>
                  <DropdownMenuTrigger aria-label="Change project status" className="cursor-pointer rounded-md focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none">
                    <ProjectStatusBadge status={project.status} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-44">
                    <DropdownMenuLabel className="text-xs text-muted-foreground">Status</DropdownMenuLabel>
                    {PROJECT_STATUSES.map((s) => (
                      <DropdownMenuItem
                        key={s.id}
                        disabled={s.id === project.status}
                        onSelect={() => {
                          actions.setProjectStatus(project.id, s.id);
                          toast(`Status: ${s.label}`, { description: project.name });
                        }}
                      >
                        <ProjectStatusBadge status={s.id} />
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                {project.priority && <PriorityIndicator priority={project.priority} showLabel />}
                {project.category && <span className="text-muted-foreground">{project.category}</span>}
                {project.targetDate && (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarClock className="size-3.5 text-muted-foreground" />
                    <span title={formatLongDate(project.targetDate)}>Target {formatShortDate(project.targetDate)}</span>
                    <DeadlineChip date={project.targetDate} today={workspace.today} done={done} />
                  </span>
                )}
                {project.preparationDate && !done && (
                  <span className="inline-flex items-center gap-1.5 text-primary">
                    <Hourglass className="size-3.5" />
                    {project.preparationDate <= workspace.today ? "Preparation time — started" : "Start preparing"} {formatShortDate(project.preparationDate)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 md:flex-col md:items-end">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditing(true)}>
                <Pencil className="size-3.5" />
                Edit project
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="More project actions">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {project.status === "archived" ? (
                    <DropdownMenuItem onSelect={() => (actions.setProjectStatus(project.id, "active"), toast("Project restored"))}>
                      <ArchiveRestore />
                      Restore
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onSelect={() => (actions.setProjectStatus(project.id, "archived"), toast("Project archived — nothing was deleted"))}>
                      <Archive />
                      Archive
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setDeleting(true)} className="text-rose-700 focus:text-rose-800">
                    <Trash2 className="text-rose-500" />
                    Delete…
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <ProgressRing value={progress.percent ?? 0} size={56} stroke={5} label={progress.percent === null ? "No tasks yet" : `${progress.percent}% complete`}>
              <span className="text-xs font-bold tabular-nums">{progress.percent === null ? "—" : `${progress.percent}%`}</span>
            </ProgressRing>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {[
            { label: "Total tasks", value: progress.total },
            { label: "Completed", value: progress.completed },
            { label: "Remaining", value: progress.remaining },
            { label: "Complete", value: progress.percent === null ? "—" : `${progress.percent}%` },
            { label: "Milestones ahead", value: progress.upcomingMilestones },
            { label: "Overdue tasks", value: progress.overdue },
          ].map((s) => (
            <div key={s.label} className="rounded-lg bg-muted/60 px-3 py-2">
              <dt className="text-[11px] font-semibold text-muted-foreground">{s.label}</dt>
              <dd className="text-base font-bold tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>
        {progress.percent === 100 && project.status !== "completed" && (
          <p className="mt-3 text-xs text-muted-foreground">
            All tasks are done. Mark the project Completed whenever it feels finished — it won’t change on its own.
          </p>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <ProjectTaskList projectId={project.id} />
        <div className="flex min-w-0 flex-col gap-5">
          <MilestoneList projectId={project.id} />
          <ProjectNotes key={project.id} project={project} />
        </div>
      </div>

      {editing && <ProjectEditorDialog project={project} open={editing} onOpenChange={setEditing} />}
      {deleting && <DeleteProjectDialog project={project} open={deleting} onOpenChange={setDeleting} />}
    </div>
  );
}
