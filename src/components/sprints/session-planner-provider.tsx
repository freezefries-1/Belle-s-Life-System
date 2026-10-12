"use client";

import * as React from "react";

import { WorkspaceReady } from "@/lib/store/workspace-store";
import type { SprintId } from "@/types";

import { PlanSessionDialog } from "./plan-session-dialog";

interface SessionPlannerValue {
  open: (options?: { sprintId?: SprintId }) => void;
}

const SessionPlannerContext = React.createContext<SessionPlannerValue | null>(null);

/** "Plan a Session" can be opened from the Sprints board, a column or the Today page. */
export function SessionPlannerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<{ open: boolean; sprintId?: SprintId; key: number }>({
    open: false,
    key: 0,
  });

  const value = React.useMemo<SessionPlannerValue>(
    () => ({ open: (options) => setState((s) => ({ open: true, sprintId: options?.sprintId, key: s.key + 1 })) }),
    [],
  );

  return (
    <SessionPlannerContext.Provider value={value}>
      {children}
      {state.key > 0 && (
        <WorkspaceReady fallback={null}>
          <PlanSessionDialog
            key={state.key}
            open={state.open}
            initialSprint={state.sprintId}
            onOpenChange={(open) => setState((s) => ({ ...s, open }))}
          />
        </WorkspaceReady>
      )}
    </SessionPlannerContext.Provider>
  );
}

export function useSessionPlanner() {
  const ctx = React.useContext(SessionPlannerContext);
  if (!ctx) throw new Error("useSessionPlanner must be used inside <SessionPlannerProvider>");
  return ctx;
}
