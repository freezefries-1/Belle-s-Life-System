"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { isOpenProject } from "@/lib/projects/project-model";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";
import type { Capture } from "@/types";

/** Brain Dump → ⋯ → Add to project notes: pick a project; the entry is added to the end of its notes. */
export function FileToProjectDialog({ capture, open, onOpenChange }: { capture: Capture; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { workspace, actions } = useWorkspace();
  const projects = workspace.projects.filter(isOpenProject).sort((a, b) => a.name.localeCompare(b.name));
  const [projectId, setProjectId] = React.useState<string | null>(null);
  const filedRef = React.useRef(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    const filed = actions.fileCaptureToProject(capture.id, projectId);
    filedRef.current = !!filed;
    onOpenChange(false);
    if (!filed) return;
    const name = workspace.projects.find((p) => p.id === projectId)?.name ?? "the project";
    toast(`Added to ${name} notes`, {
      description: capture.title,
      action: { label: "Undo", onClick: () => actions.undoFileCapture(filed) },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="top-4 max-w-md sm:top-[12%]"
        // The entry's row is gone once it's filed, so return focus to the page rather than nowhere.
        onCloseAutoFocus={(e) => {
          if (!filedRef.current) return;
          e.preventDefault();
          document.getElementById("main")?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>Add to project notes</DialogTitle>
          <DialogDescription>
            “{capture.title}” is added to the end of the project’s notes, with today’s date, and leaves the Brain Dump. The project’s existing notes aren’t
            changed.
          </DialogDescription>
        </DialogHeader>
        {projects.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">
            You don’t have any open projects yet.{" "}
            <Link href="/projects" className="font-semibold text-primary hover:text-primary-strong" onClick={() => onOpenChange(false)}>
              Create one
            </Link>{" "}
            first, or keep this as a note instead.
          </p>
        ) : (
          <form
            id="file-to-project"
            onSubmit={submit}
            // Enter on a chosen project submits (browsers don't do this for radio buttons).
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.target as HTMLElement).matches("input[type=radio]")) {
                e.preventDefault();
                e.currentTarget.requestSubmit();
              }
            }}
          >
            <fieldset className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
              <legend className="sr-only">Project</legend>
              {projects.map((p) => (
                <label
                  key={p.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-[13.5px] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/50",
                    projectId === p.id ? "border-primary bg-accent font-semibold" : "hover:bg-muted/50",
                  )}
                >
                  <input type="radio" name="project" value={p.id} checked={projectId === p.id} onChange={() => setProjectId(p.id)} className="size-4 accent-primary" />
                  <span className="min-w-0 truncate">{p.name}</span>
                </label>
              ))}
            </fieldset>
          </form>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {projects.length > 0 && (
            <Button type="submit" form="file-to-project" disabled={!projectId}>
              Add to notes
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
