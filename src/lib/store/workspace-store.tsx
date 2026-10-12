"use client";

import * as React from "react";

import { createMockWorkspace } from "@/data/mock-workspace";
import { createId } from "@/lib/utils";
import { useToday } from "@/lib/use-today";
import type { CaptureKind, SprintId, Task, TaskStatus, Workspace } from "@/types";

/**
 * In-memory workspace store for Phase 1.
 *
 * Everything lives in React state and resets on refresh — nothing is saved.
 * In Phase 2 each action becomes a Supabase mutation; components keep
 * calling the same `useWorkspace()` API.
 */

type Updater = (ws: Workspace) => Workspace;

export interface WorkspaceActions {
  toggleTask: (id: string) => void;
  setTaskStatus: (id: string, status: TaskStatus) => void;
  moveTask: (id: string, sprintId: SprintId) => void;
  setHighlight: (id: string | null) => void;
  addCapture: (text: string, kind?: CaptureKind) => void;
  toggleCaptureProcessed: (id: string) => void;
  removeCapture: (id: string) => void;
  convertCaptureToTask: (id: string, sprintId: SprintId) => void;
  toggleCommitment: (id: string) => void;
}

interface WorkspaceContextValue {
  workspace: Workspace;
  actions: WorkspaceActions;
}

const WorkspaceContext = React.createContext<WorkspaceContextValue | null>(null);

function patchTask(ws: Workspace, id: string, patch: (t: Task) => Task): Workspace {
  return { ...ws, tasks: ws.tasks.map((t) => (t.id === id ? patch(t) : t)) };
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const today = useToday();
  // `edited` stays null until the first change, so the base data can be
  // built as soon as the viewer's local date is known (after hydration).
  const [edited, setEdited] = React.useState<Workspace | null>(null);
  const base = React.useMemo(() => (today ? createMockWorkspace(today) : null), [today]);
  const workspace = edited ?? base;

  const baseRef = React.useRef(base);
  React.useEffect(() => {
    baseRef.current = base;
  }, [base]);

  const actions = React.useMemo<WorkspaceActions>(() => {
    const update = (fn: Updater) =>
      setEdited((prev) => {
        const current = prev ?? baseRef.current;
        return current ? fn(current) : prev;
      });

    return {
      toggleTask: (id) =>
        update((ws) =>
          patchTask(ws, id, (t) =>
            t.status === "done"
              ? { ...t, status: "todo", completedDate: null }
              : { ...t, status: "done", completedDate: ws.today },
          ),
        ),
      setTaskStatus: (id, status) =>
        update((ws) =>
          patchTask(ws, id, (t) => ({
            ...t,
            status,
            completedDate: status === "done" ? ws.today : null,
          })),
        ),
      moveTask: (id, sprintId) => update((ws) => patchTask(ws, id, (t) => ({ ...t, sprintId }))),
      setHighlight: (id) => update((ws) => ({ ...ws, highlightTaskId: id })),
      addCapture: (text, kind = "task") =>
        update((ws) => ({
          ...ws,
          captures: [
            { id: createId("b"), text, kind, capturedDate: ws.today, processed: false },
            ...ws.captures,
          ],
        })),
      toggleCaptureProcessed: (id) =>
        update((ws) => ({
          ...ws,
          captures: ws.captures.map((c) => (c.id === id ? { ...c, processed: !c.processed } : c)),
        })),
      removeCapture: (id) =>
        update((ws) => ({ ...ws, captures: ws.captures.filter((c) => c.id !== id) })),
      convertCaptureToTask: (id, sprintId) =>
        update((ws) => {
          const capture = ws.captures.find((c) => c.id === id);
          if (!capture) return ws;
          const task: Task = {
            id: createId("t"),
            title: capture.text,
            sprintId,
            projectId: null,
            status: "todo",
            plannedDate: null,
            dueDate: null,
            estimateMinutes: null,
            actualMinutes: null,
            completedDate: null,
          };
          return {
            ...ws,
            tasks: [task, ...ws.tasks],
            captures: ws.captures.map((c) => (c.id === id ? { ...c, processed: true } : c)),
          };
        }),
      toggleCommitment: (id) =>
        update((ws) => ({
          ...ws,
          commitments: ws.commitments.map((c) => {
            if (c.id !== id) return c;
            const done = c.completedDates.includes(ws.today);
            return {
              ...c,
              completedDates: done
                ? c.completedDates.filter((date) => date !== ws.today)
                : [...c.completedDates, ws.today],
            };
          }),
        })),
    };
  }, []);

  const value = React.useMemo(
    () => (workspace ? { workspace, actions } : null),
    [workspace, actions],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

/** Returns null until the workspace is ready (i.e. during server render). */
export function useWorkspaceOptional() {
  return React.useContext(WorkspaceContext);
}

/** For components rendered inside <WorkspaceReady>. */
export function useWorkspace() {
  const ctx = React.useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside <WorkspaceReady>");
  return ctx;
}

/** Renders children only once workspace data is available. */
export function WorkspaceReady({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback: React.ReactNode;
}) {
  const ctx = React.useContext(WorkspaceContext);
  return ctx ? children : fallback;
}
