"use client";

import * as React from "react";
import { FolderKanban, Plus } from "lucide-react";

import { DeadlineOverview } from "@/components/projects/deadline-overview";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectEditorDialog } from "@/components/projects/project-editor-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { FilterSelect } from "@/components/tasks/task-filters";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PROJECT_STATUSES, getProjectProgress } from "@/lib/projects/project-model";
import { useWorkspace } from "@/lib/store/workspace-store";
import type { Project, ProjectStatus } from "@/types";

type Sort = "target" | "name" | "updated" | "progress";

export function ProjectsPage() {
  const { workspace } = useWorkspace();
  const [status, setStatus] = React.useState<ProjectStatus>("active");
  const [sort, setSort] = React.useState<Sort>("target");
  const [creating, setCreating] = React.useState(false);

  const counts = Object.fromEntries(PROJECT_STATUSES.map((s) => [s.id, workspace.projects.filter((p) => p.status === s.id).length]));
  const progressOf = (p: Project) => getProjectProgress(workspace.tasks, workspace.milestones, p.id, workspace.today).percent ?? -1;
  const projects = workspace.projects
    .filter((p) => p.status === status)
    .sort((a, b) => {
      switch (sort) {
        case "name":
          return a.name.localeCompare(b.name);
        case "updated":
          return b.updatedAt.localeCompare(a.updatedAt);
        case "progress":
          return progressOf(b) - progressOf(a);
        default:
          return (a.targetDate ?? "9999").localeCompare(b.targetDate ?? "9999") || a.name.localeCompare(b.name);
      }
    });

  return (
    <>
      <PageHeader
        title="Projects"
        description="The bigger outcomes your sprints add up to. Projects give direction; deadlines give awareness."
        actions={
          <Button onClick={() => setCreating(true)} className="gap-1.5">
            <Plus className="size-4" strokeWidth={2.5} />
            New project
          </Button>
        }
      />

      {workspace.projects.length === 0 ? (
        <Card className="items-center py-12">
          <EmptyState icon={FolderKanban} title="No projects yet" description="Group related tasks under one outcome — a launch, a tournament, a home project." className="py-0" />
          <Button className="mt-4" onClick={() => setCreating(true)}>
            Create your first project
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                <Tabs value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
                  <TabsList>
                    {PROJECT_STATUSES.map((s) => (
                      <TabsTrigger standalone key={s.id} value={s.id}>
                        {s.label}
                        {counts[s.id] > 0 && <span className="text-muted-foreground tabular-nums">{counts[s.id]}</span>}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
              <FilterSelect
                label="Sort projects by"
                value={sort}
                onChange={(v) => setSort(v as Sort)}
                options={[
                  { value: "target", label: "Target date" },
                  { value: "name", label: "Name" },
                  { value: "updated", label: "Recently updated" },
                  { value: "progress", label: "Progress" },
                ]}
              />
            </div>
            {projects.length === 0 ? (
              <p className="rounded-xl border border-dashed bg-card/60 px-4 py-8 text-center text-[13px] text-muted-foreground">
                No {PROJECT_STATUSES.find((s) => s.id === status)?.label.toLowerCase()} projects.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {projects.map((p) => (
                  <ProjectCard key={p.id} project={p} />
                ))}
              </div>
            )}
          </div>
          <aside className="min-w-0" aria-label="Deadlines">
            <DeadlineOverview limit={10} />
          </aside>
        </div>
      )}
      {creating && <ProjectEditorDialog open={creating} onOpenChange={setCreating} />}
    </>
  );
}
