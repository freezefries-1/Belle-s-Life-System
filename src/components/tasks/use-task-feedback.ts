"use client";

import { toast } from "sonner";

import { TASK_STATUS_LABEL } from "@/lib/tasks/task-model";
import { useWorkspaceActions } from "@/lib/store/workspace-store";
import type { Task, TaskStatus } from "@/types";

/**
 * Task actions with consistent, subtle feedback. Every view uses these so
 * completing or deleting a task feels the same everywhere.
 */
export function useTaskFeedback() {
  const actions = useWorkspaceActions();

  return {
    toggleComplete(task: Task) {
      const updated = actions.toggleTaskComplete(task.id);
      if (!updated) return;
      if (updated.status === "completed") {
        toast("Task completed", {
          description: task.title,
          action: { label: "Undo", onClick: () => actions.setTaskStatus(task.id, task.status) },
        });
      } else {
        toast("Task reopened", { description: task.title });
      }
    },

    setStatus(task: Task, status: TaskStatus) {
      if (task.status === status) return;
      actions.setTaskStatus(task.id, status);
      toast(`Marked as ${TASK_STATUS_LABEL[status]}`, {
        description: task.title,
        action: { label: "Undo", onClick: () => actions.setTaskStatus(task.id, task.status) },
      });
    },

    remove(task: Task) {
      const removed = actions.deleteTask(task.id);
      if (!removed) return;
      toast("Task deleted", {
        description: removed.title,
        action: { label: "Undo", onClick: () => actions.restoreTask(removed) },
      });
    },
  };
}
