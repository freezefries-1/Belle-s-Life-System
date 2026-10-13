"use client";

import { History } from "lucide-react";

import { SprintDot } from "@/components/shared/sprint-badge";
import { Card } from "@/components/ui/card";
import { SPRINT_BY_ID } from "@/data/sprints";
import { localDateOf, relativeDayLabel } from "@/lib/date";
import { getSessionHistory } from "@/lib/selectors";
import { useWorkspace } from "@/lib/store/workspace-store";
import { formatMinutes } from "@/lib/utils";

/** A light log of finished sessions — Time Estimation and the Weekly Review use it too. */
export function SessionHistory({ limit = 8 }: { limit?: number }) {
  const { workspace } = useWorkspace();
  const history = getSessionHistory(workspace).slice(0, limit);
  if (history.length === 0) return null;

  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
        <History className="size-3.5" />
        <span className="group-open:hidden">Show</span>
        <span className="hidden group-open:inline">Hide</span> recent sessions ({history.length})
      </summary>
      <Card className="mt-3 overflow-hidden">
        <ul className="divide-y">
          {history.map((s) => {
            const sprint = SPRINT_BY_ID[s.sprintId];
            const actual = Math.round(s.accumulatedElapsedSeconds / 60);
            return (
              <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-[13px] sm:px-5">
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <SprintDot sprintId={s.sprintId} />
                  <span className="truncate font-medium">
                    Sprint {sprint.number}: {sprint.name}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {relativeDayLabel(localDateOf(s.endedAt ?? s.createdAt), workspace.today)}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatMinutes(actual)} of {formatMinutes(s.plannedMinutes)}
                </span>
                <span className="text-xs font-semibold tabular-nums">
                  {s.completedTaskIds.length}/{s.taskIds.length} done
                </span>
              </li>
            );
          })}
        </ul>
      </Card>
    </details>
  );
}
