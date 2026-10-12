"use client";

import * as React from "react";

import { WorkspaceReady } from "@/lib/store/workspace-store";
import type { TaskInput } from "@/types";

import { TaskEditorDialog, type TaskEditorTarget } from "./task-editor-dialog";

interface TaskEditorContextValue {
  /** New task, optionally pre-filled (e.g. a sprint). */
  openCreate: (defaults?: Partial<TaskInput>) => void;
  openEdit: (taskId: string) => void;
  /** Turn a Brain Dump entry into a task. */
  openConvert: (captureId: string) => void;
}

const TaskEditorContext = React.createContext<TaskEditorContextValue | null>(null);

/** One shared task editor for the whole app. */
export function TaskEditorProvider({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = React.useState<TaskEditorTarget | null>(null);
  const [open, setOpen] = React.useState(false);
  // Bumped on every open so the form always starts from fresh values.
  const [session, setSession] = React.useState(0);

  const value = React.useMemo<TaskEditorContextValue>(() => {
    const show = (t: TaskEditorTarget) => {
      setTarget(t);
      setSession((s) => s + 1);
      setOpen(true);
    };
    return {
      openCreate: (defaults) => show({ mode: "create", defaults }),
      openEdit: (taskId) => show({ mode: "edit", taskId }),
      openConvert: (captureId) => show({ mode: "convert", captureId }),
    };
  }, []);

  return (
    <TaskEditorContext.Provider value={value}>
      {children}
      {target && (
        <WorkspaceReady fallback={null}>
          <TaskEditorDialog key={session} target={target} open={open} onOpenChange={setOpen} />
        </WorkspaceReady>
      )}
    </TaskEditorContext.Provider>
  );
}

export function useTaskEditor() {
  const ctx = React.useContext(TaskEditorContext);
  if (!ctx) throw new Error("useTaskEditor must be used inside <TaskEditorProvider>");
  return ctx;
}
