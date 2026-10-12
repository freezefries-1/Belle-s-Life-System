"use client";

import * as React from "react";
import { Timer } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { BoardToolbar } from "@/components/sprints/board-toolbar";
import { CurrentSessionWidget } from "@/components/sprints/current-session-widget";
import { SessionHistory } from "@/components/sprints/session-history";
import { useSessionPlanner } from "@/components/sprints/session-planner-provider";
import { SprintBoard } from "@/components/sprints/sprint-board";
import { Button } from "@/components/ui/button";
import { getOpenSession } from "@/lib/selectors";
import { useWorkspace } from "@/lib/store/workspace-store";
import { DEFAULT_BOARD_QUERY, type BoardQuery } from "@/lib/tasks/sprint-board";

export function SprintsPage() {
  const { workspace } = useWorkspace();
  const planner = useSessionPlanner();
  const [query, setQuery] = React.useState<BoardQuery>(DEFAULT_BOARD_QUERY);
  const hasOpenSession = getOpenSession(workspace) !== null;

  return (
    <>
      <PageHeader
        title="Sprints"
        description="Four kinds of work, side by side. They’re not a queue — start wherever your energy is today."
        actions={
          !hasOpenSession && (
            <Button onClick={() => planner.open()} className="gap-1.5">
              <Timer className="size-4" />
              Plan a session
            </Button>
          )
        }
      />
      <CurrentSessionWidget className="mb-5" />
      <BoardToolbar query={query} onChange={(patch) => setQuery((q) => ({ ...q, ...patch }))} projects={workspace.projects} />
      <SprintBoard query={query} />
      <div className="mt-6">
        <SessionHistory />
      </div>
    </>
  );
}
