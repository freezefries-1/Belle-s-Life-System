"use client";

import * as React from "react";
import { ListChecks, Plus, Repeat, SearchX } from "lucide-react";

import { RecurringTasksPanel } from "@/components/recurrence/recurring-tasks-panel";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { TaskFilters, isQueryFiltered } from "@/components/tasks/task-filters";
import { TaskItem } from "@/components/tasks/task-item";
import { useTaskEditor } from "@/components/tasks/task-editor-provider";
import { TaskSummary, type SummaryKey } from "@/components/tasks/task-summary";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkspace } from "@/lib/store/workspace-store";
import {
  DEFAULT_TASK_QUERY,
  TASK_VIEWS,
  filterTasks,
  getTaskSummary,
  sortCompleted,
  sortTasks,
  type TaskQuery,
  type TaskView,
} from "@/lib/tasks/task-queries";
import { formatMinutes } from "@/lib/utils";

const SUMMARY_QUERIES: Record<SummaryKey, Partial<TaskQuery>> = {
  active: { view: "all", status: "open", due: "any" },
  dueToday: { view: "today", status: "open", due: "any" },
  overdue: { view: "all", status: "open", due: "overdue" },
  completed: { view: "completed", due: "any" },
};

export function TasksPage() {
  const { workspace } = useWorkspace();
  const editor = useTaskEditor();
  const [query, setQuery] = React.useState<TaskQuery>(DEFAULT_TASK_QUERY);
  const update = (patch: Partial<TaskQuery>) =>
    setQuery((q) => ({ ...q, ...patch }));
  const [section, setSection] = useHashSection();

  const summary = getTaskSummary(workspace.tasks, workspace.today);
  const filtered = filterTasks(workspace.tasks, query, workspace.today);
  const tasks =
    query.view === "completed" && query.sort === "due"
      ? sortCompleted(filtered)
      : sortTasks(filtered, query.sort);
  const openMinutes = tasks
    .filter((t) => t.status === "todo" || t.status === "in_progress")
    .reduce((sum, t) => sum + (t.estimatedMinutes ?? 0), 0);

  const selectedSummary =
    (Object.keys(SUMMARY_QUERIES) as SummaryKey[]).find((key) =>
      Object.entries(SUMMARY_QUERIES[key]).every(
        ([k, v]) => query[k as keyof TaskQuery] === v,
      ),
    ) ?? null;

  return (
    <>
      <PageHeader
        title="Tasks"
        description="Everything you need to do, organised in one place."
        actions={
          <Button onClick={() => editor.openCreate()} className="gap-1.5">
            <Plus className="size-4" strokeWidth={2.5} />
            Add Task
          </Button>
        }
      />

      <div
        className="mb-4 inline-flex rounded-lg border bg-card p-0.5"
        role="group"
        aria-label="Tasks section"
      >
        {(
          [
            { id: "list", label: "All tasks", icon: ListChecks },
            {
              id: "recurring",
              label: `Recurring${workspace.recurrences.length ? ` · ${workspace.recurrences.length}` : ""}`,
              icon: Repeat,
            },
          ] as const
        ).map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={section === s.id}
            onClick={() => setSection(s.id)}
            className={
              "inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors " +
              (section === s.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            <s.icon className="size-3.5" />
            {s.label}
          </button>
        ))}
      </div>

      {section === "recurring" ? (
        <RecurringTasksPanel />
      ) : (
        <>
          <TaskSummary
            summary={summary}
            selected={workspace.tasks.length ? selectedSummary : null}
            onSelect={(key) => update(SUMMARY_QUERIES[key])}
          />

          <div className="mb-3 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <Tabs
              value={query.view}
              onValueChange={(v) => update({ view: v as TaskView })}
            >
              <TabsList>
                {TASK_VIEWS.map((v) => (
                  <TabsTrigger key={v.id} value={v.id}>
                    {v.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="mb-4">
            <TaskFilters query={query} onChange={update} />
          </div>

          <Card className="overflow-hidden">
            <div
              className="flex items-center justify-between border-b px-4 py-2.5 text-xs text-muted-foreground"
              aria-live="polite"
            >
              <span className="tabular-nums">
                {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
              </span>
              {openMinutes > 0 && (
                <span className="tabular-nums">
                  ≈ {formatMinutes(openMinutes)} of open work
                </span>
              )}
            </div>

            {workspace.tasks.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
                <EmptyState
                  icon={ListChecks}
                  title="No tasks yet"
                  description="Add one here, or turn something from your Brain Dump into a task."
                  className="py-0"
                />
                <Button onClick={() => editor.openCreate()} className="gap-1.5">
                  <Plus className="size-4" />
                  Add your first task
                </Button>
              </div>
            ) : tasks.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10">
                <EmptyState
                  icon={SearchX}
                  title={
                    isQueryFiltered(query)
                      ? "No tasks match these filters"
                      : emptyViewTitle(query.view)
                  }
                  description={
                    isQueryFiltered(query)
                      ? "Try clearing a filter or searching for something else."
                      : undefined
                  }
                  className="py-0"
                />
              </div>
            ) : (
              <ul className="flex flex-col divide-y p-1.5">
                {tasks.map((t) => (
                  <li key={t.id}>
                    <TaskItem task={t} showProject />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </>
  );
}

/** `#recurring` opens the Recurring section, so it can be linked to directly. */
function useHashSection() {
  const [section, setSection] = React.useState<"list" | "recurring">("list");
  React.useEffect(() => {
    const sync = () =>
      setSection(window.location.hash === "#recurring" ? "recurring" : "list");
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const change = (next: "list" | "recurring") => {
    setSection(next);
    window.history.replaceState(
      null,
      "",
      next === "recurring" ? "#recurring" : window.location.pathname,
    );
  };
  return [section, change] as const;
}

function emptyViewTitle(view: TaskView) {
  switch (view) {
    case "today":
      return "Nothing due today";
    case "upcoming":
      return "Nothing coming up";
    case "completed":
      return "No completed tasks yet";
    case "unscheduled":
      return "Every task has a date";
    default:
      return "No open tasks";
  }
}
