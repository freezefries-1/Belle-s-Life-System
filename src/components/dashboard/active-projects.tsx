"use client";

import Link from "next/link";

import { SectionHeader } from "@/components/shared/page-header";
import { ProjectCard } from "@/components/shared/project-card";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";

export function ActiveProjects({ className }: { className?: string }) {
  const { workspace } = useWorkspace();
  const projects = workspace.projects.filter((p) => p.status === "active");

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
      </div>
    </section>
  );
}
