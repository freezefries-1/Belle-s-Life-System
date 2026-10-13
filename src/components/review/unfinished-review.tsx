"use client";

import * as React from "react";
import { CalendarClock, History } from "lucide-react";

import { SprintDot } from "@/components/shared/sprint-badge";
import { useTaskEditor } from "@/components/tasks/task-editor-provider";
import { useTaskFeedback } from "@/components/tasks/use-task-feedback";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SPRINTS } from "@/data/sprints";
import { formatShortDate, localDateOf } from "@/lib/date";
import { useWorkspace } from "@/lib/store/workspace-store";
import type { SprintId, Task } from "@/types";

import type { WeekSummary } from "@/lib/review/weekly";

const NONE = "none";

/**
 * Tasks that were due by the end of the week and still open then. Nothing
 * here moves on its own — each change is the user's choice.
 */
export function UnfinishedReview({ summary }: { summary: WeekSummary }) {
  const { workspace, actions } = useWorkspace();
  // Keep rows in place while reviewing, so a task doesn't vanish the moment
  // it gets a new date or is completed. (Remounts per week.)
  const [shownIds] = React.useState(() => summary.stillOpen.map((t) => t.id));
  const stillOpen = [
    ...shownIds.map((id) => workspace.tasks.find((t) => t.id === id)).filter((t): t is Task => !!t),
    ...summary.stillOpen.filter((t) => !shownIds.includes(t.id)),
  ];
  const openNow = stillOpen.filter((t) => t.status === "todo" || t.status === "in_progress");
  const laterDone = summary.unfinished.filter((t) => t.status === "completed" && !shownIds.includes(t.id));
  return (
    <Card className="p-5">
      <h3 className="text-[15px] font-semibold">Unfinished at the end of the week</h3>
      <p className="mt-0.5 flex items-start gap-1.5 text-xs text-muted-foreground">
        <History className="mt-px size-3.5 shrink-0" />
        {summary.isPast
          ? "Reconstructed from when tasks were created and completed. Due dates are their current values (earlier changes aren't recorded), and skipped tasks aren't included."
          : "A current snapshot — this week isn't over yet."}
      </p>
      {stillOpen.length === 0 && laterDone.length === 0 ? (
        <p className="mt-4 text-[13px] text-muted-foreground">Nothing due was left open. 🌱</p>
      ) : (
        <ul className="mt-3 flex flex-col divide-y" aria-label="Unfinished tasks">
          {stillOpen.map((t) =>
            t.status === "completed" || t.status === "skipped" ? (
              <li key={t.id} className="flex items-center gap-3 py-2.5 text-[13px] text-muted-foreground">
                <Checkbox
                  checked={t.status === "completed"}
                  onCheckedChange={() => actions.toggleTaskComplete(t.id)}
                  aria-label={`Reopen “${t.title}”`}
                />
                <span className="min-w-0 flex-1 truncate line-through">{t.title}</span>
                <span className="shrink-0 text-xs">{t.status === "completed" ? "Done just now" : "Skipped"}</span>
              </li>
            ) : (
              <OpenRow key={t.id} task={t} />
            ),
          )}
          {laterDone.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-2.5 text-[13px] text-muted-foreground">
              <Checkbox checked disabled aria-label={`${t.title} (completed later)`} />
              <span className="min-w-0 flex-1 truncate line-through">{t.title}</span>
              <span className="shrink-0 text-xs">Completed later · {formatShortDate(localDateOf(t.completedAt!))}</span>
            </li>
          ))}
        </ul>
      )}
      {openNow.length > 0 && (
        <p className="mt-3 text-[11px] text-muted-foreground">Leave anything as it is, or give it a new date or Sprint. Nothing is rescheduled automatically.</p>
      )}
    </Card>
  );
}

function OpenRow({ task }: { task: Task }) {
  const { workspace, actions } = useWorkspace();
  const editor = useTaskEditor();
  const feedback = useTaskFeedback();
  const overdue = !!task.dueDate && task.dueDate < workspace.today;
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Checkbox checked={false} onCheckedChange={() => feedback.toggleComplete(task)} aria-label={`Complete “${task.title}”`} className="mt-[3px]" />
        <div className="min-w-0">
          <button type="button" onClick={() => editor.openEdit(task.id)} className="cursor-pointer text-left text-[13px] font-semibold hover:text-primary">
            {task.title}
          </button>
          <p className={overdue ? "flex items-center gap-1 text-xs text-rose-700" : "flex items-center gap-1 text-xs text-muted-foreground"}>
            <CalendarClock className="size-3" />
            Due {formatShortDate(task.dueDate!)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 pl-7 sm:pl-0">
        <Input
          type="date"
          aria-label={`New due date for “${task.title}”`}
          value={task.dueDate ?? ""}
          onChange={(e) => e.target.value && actions.updateTask(task.id, { dueDate: e.target.value })}
          className="h-8 w-36 text-xs"
        />
        <Select value={task.sprint ?? NONE} onValueChange={(v) => actions.moveTaskToSprint(task.id, v === NONE ? null : (v as SprintId))}>
          <SelectTrigger aria-label={`Sprint for “${task.title}”`} className="h-8 w-32 text-xs" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Unassigned</SelectItem>
            {SPRINTS.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                <SprintDot sprintId={s.id} className="size-1.5" />
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </li>
  );
}
