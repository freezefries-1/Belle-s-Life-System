"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWorkspace } from "@/lib/store/workspace-store";
import type { Project } from "@/types";

/** Deleting a project never deletes its tasks — they stay, without a project. */
export function DeleteProjectDialog({ project, open, onOpenChange }: { project: Project; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { workspace, actions } = useWorkspace();
  const router = useRouter();
  const taskCount = workspace.tasks.filter((t) => t.projectId === project.id).length;
  const milestoneCount = workspace.milestones.filter((m) => m.projectId === project.id).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete “{project.name}”?</DialogTitle>
          <DialogDescription>
            {taskCount > 0
              ? `Its ${taskCount} ${taskCount === 1 ? "task stays" : "tasks stay"} in your task list, just without a project.`
              : "It has no tasks."}{" "}
            {milestoneCount > 0 && `Its ${milestoneCount} ${milestoneCount === 1 ? "milestone" : "milestones"} and notes will be removed.`} To keep
            everything, archive it instead.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-rose-600 hover:bg-rose-700"
            onClick={() => {
              actions.deleteProject(project.id);
              onOpenChange(false);
              toast("Project deleted — its tasks are now unassigned", { description: project.name });
              router.push("/projects");
            }}
          >
            Delete project, keep tasks
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
