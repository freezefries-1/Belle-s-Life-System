"use client";

import * as React from "react";

import { RecurrenceEditorDialog } from "@/components/recurrence/recurrence-editor-dialog";
import { WorkspaceReady, useWorkspace } from "@/lib/store/workspace-store";
import type { TaskInput } from "@/types";

import { TaskEditorDialog, type TaskEditorTarget } from "./task-editor-dialog";

interface TaskEditorContextValue {
  /** New task, optionally pre-filled (e.g. a sprint). */
  openCreate: (defaults?: Partial<TaskInput>, options?: { repeat?: boolean }) => void;
  openEdit: (taskId: string) => void;
  /** Turn a Brain Dump entry into a task. */
  openConvert: (captureId: string) => void;
  /** Edit a repeating task's series (future occurrences). */
  openSeries: (templateId: string) => void;
}

const TaskEditorContext = React.createContext<TaskEditorContextValue | null>(null);

/** One shared task editor for the whole app. */
export function TaskEditorProvider({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = React.useState<TaskEditorTarget | null>(null);
  const [open, setOpen] = React.useState(false);
  // Bumped on every open so the form always starts from fresh values.
  const [session, setSession] = React.useState(0);
  const [seriesId, setSeriesId] = React.useState<string | null>(null);

  const value = React.useMemo<TaskEditorContextValue>(() => {
    const show = (t: TaskEditorTarget) => {
      setTarget(t);
      setSession((s) => s + 1);
      setOpen(true);
    };
    return {
      openCreate: (defaults, options) => show({ mode: "create", defaults, repeat: options?.repeat }),
      openEdit: (taskId) => show({ mode: "edit", taskId }),
      openConvert: (captureId) => show({ mode: "convert", captureId }),
      openSeries: (templateId) => {
        setOpen(false);
        setSeriesId(templateId);
      },
    };
  }, []);

  return (
    <TaskEditorContext.Provider value={value}>
      {children}
      {target && (
        <WorkspaceReady fallback={null}>
          <TaskEditorDialog key={session} target={target} open={open} onOpenChange={setOpen} onEditSeries={value.openSeries} />
        </WorkspaceReady>
      )}
      {seriesId && (
        <WorkspaceReady fallback={null}>
          <SeriesEditor templateId={seriesId} onClose={() => setSeriesId(null)} />
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

function SeriesEditor({ templateId, onClose }: { templateId: string; onClose: () => void }) {
  const { workspace } = useWorkspace();
  const template = workspace.recurrences.find((r) => r.id === templateId);
  if (!template) return null;
  return <RecurrenceEditorDialog template={template} open onOpenChange={(o) => !o && onClose()} />;
}
