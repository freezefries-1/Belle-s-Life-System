"use client";

import Link from "next/link";
import { FolderKanban } from "lucide-react";

import { ProjectCard } from "@/components/projects/project-card";
import { SectionHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";

export function ActiveProjects({ className }: { className?: string }) {
  const { workspace } = useWorkspace();
  const projects = workspace.projects
    .filter((p) => p.status === "active")
    .sort((a, b) => (a.targetDate ?? "9999").localeCompare(b.targetDate ?? "9999"))
    .slice(0, 4);

  return (
    <section className={cn("flex flex-col gap-4", className)} aria-labelledby="projects-heading">
      <SectionHeader
        title={<span id="projects-heading">Active projects</span>}
        description="Where your sprints are taking you."
        action={
          <Link href="/projects" className="text-xs font-semibold text-primary hover:text-primary-hover">
            All projects
          </Link>
        }
      />
      {projects.length === 0 ? (
        <Card className="flex-row items-center gap-3 p-5">
          <FolderKanban className="size-5 shrink-0 text-muted-foreground" />
          <p className="flex-1 text-[13px] text-muted-foreground">No active projects. Group related tasks under one outcome to see progress here.</p>
          <Link href="/projects" className="shrink-0 text-xs font-semibold text-primary hover:text-primary-hover">
            Go to Projects
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} compact />
          ))}
        </div>
      )}
    </section>
  );
}
