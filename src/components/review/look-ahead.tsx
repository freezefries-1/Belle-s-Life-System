"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, FolderKanban, ListChecks, PenLine, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { addDays, formatShortDate } from "@/lib/date";
import { isOpenProject } from "@/lib/projects/project-model";
import { MAX_PRIORITIES } from "@/lib/review/weekly";
import { useWorkspace } from "@/lib/store/workspace-store";
import { isActive } from "@/lib/tasks/task-model";
import { cn } from "@/lib/utils";
import type { ISODate, WeeklyPriority } from "@/types";

type Item = Pick<WeeklyPriority, "taskId" | "projectId" | "title">;
type Mode = "task" | "project" | "text";

/** Up to three priorities for the coming week — links to existing tasks or projects, or a few words. */
export function LookAhead({ weekStart, priorities }: { weekStart: ISODate; priorities: WeeklyPriority[] }) {
  const { workspace, actions } = useWorkspace();
  const items: Item[] = priorities.map(({ taskId, projectId, title }) => ({ taskId, projectId, title }));
  const save = (next: Item[]) => actions.setWeeklyPriorities(weekStart, next);
  const [mode, setMode] = React.useState<Mode>("task");
  const [query, setQuery] = React.useState("");
  const [text, setText] = React.useState("");
  const full = items.length >= MAX_PRIORITIES;
  const nextWeek = addDays(weekStart, 7);

  const chosenTasks = new Set(items.map((i) => i.taskId).filter(Boolean));
  const chosenProjects = new Set(items.map((i) => i.projectId).filter(Boolean));
  const q = query.trim().toLowerCase();
  const taskOptions = workspace.tasks
    .filter((t) => isActive(t) && !chosenTasks.has(t.id) && (!q || t.title.toLowerCase().includes(q)))
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"))
    .slice(0, 8);
  const projectOptions = workspace.projects.filter((p) => isOpenProject(p) && !chosenProjects.has(p.id) && (!q || p.name.toLowerCase().includes(q)));

  const resolve = (i: Item) => {
    if (i.taskId) {
      const t = workspace.tasks.find((x) => x.id === i.taskId);
      return { icon: ListChecks, title: t?.title ?? i.title, meta: t ? (t.status === "completed" ? "Task · done" : "Task") : "Task (deleted)" };
    }
    if (i.projectId) {
      const p = workspace.projects.find((x) => x.id === i.projectId);
      return { icon: FolderKanban, title: p?.name ?? i.title, meta: p ? "Project" : "Project (deleted)" };
    }
    return { icon: PenLine, title: i.title, meta: "Note" };
  };

  const move = (index: number, delta: number) => {
    const next = [...items];
    const [x] = next.splice(index, 1);
    next.splice(index + delta, 0, x);
    save(next);
  };

  return (
    <Card className="p-5 sm:p-6">
      <h3 className="text-[15px] font-semibold">Look ahead</h3>
      <p className="text-xs text-muted-foreground">
        Up to three priorities for the week of {formatShortDate(nextWeek)}. Linking an existing task or project doesn’t create anything new.
      </p>

      <ol className="mt-4 flex flex-col gap-2" aria-label="Next week's priorities">
        {Array.from({ length: MAX_PRIORITIES }, (_, i) => {
          const item = items[i];
          if (!item)
            return (
              <li key={`empty-${i}`} className="flex h-12 items-center gap-3 rounded-xl border border-dashed px-3 text-[13px] text-subtle-foreground">
                <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-bold">{i + 1}</span>
                Open slot
              </li>
            );
          const r = resolve(item);
          return (
            <li key={`${item.taskId ?? item.projectId ?? item.title}-${i}`} className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold">{r.title}</p>
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <r.icon className="size-3" />
                  {r.meta}
                </p>
              </div>
              <Button variant="ghost" size="icon-xs" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move “${r.title}” up`}>
                <ArrowUp />
              </Button>
              <Button variant="ghost" size="icon-xs" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label={`Move “${r.title}” down`}>
                <ArrowDown />
              </Button>
              <Button variant="ghost" size="icon-xs" onClick={() => save(items.filter((_, j) => j !== i))} aria-label={`Remove “${r.title}”`}>
                <X />
              </Button>
            </li>
          );
        })}
      </ol>

      {full ? (
        <p className="mt-3 text-xs text-muted-foreground">Three is plenty. Remove one to choose something else.</p>
      ) : (
        <div className="mt-4 rounded-xl bg-muted/50 p-3">
          <div className="inline-flex rounded-lg bg-card p-0.5" role="radiogroup" aria-label="Add a priority from">
            {(
              [
                { id: "task", label: "A task", icon: ListChecks },
                { id: "project", label: "A project", icon: FolderKanban },
                { id: "text", label: "Write one", icon: PenLine },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={mode === m.id}
                onClick={() => {
                  setMode(m.id);
                  setQuery("");
                }}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold",
                  mode === m.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <m.icon className="size-3.5" />
                {m.label}
              </button>
            ))}
          </div>

          {mode === "text" ? (
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!text.trim()) return;
                save([...items, { taskId: null, projectId: null, title: text.trim() }]);
                setText("");
              }}
            >
              <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Protect two mornings for deep work" aria-label="Priority" maxLength={140} />
              <Button type="submit" disabled={!text.trim()} className="gap-1">
                <Plus className="size-3.5" />
                Add
              </Button>
            </form>
          ) : (
            <>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={mode === "task" ? "Search open tasks" : "Search projects"}
                aria-label={mode === "task" ? "Search open tasks" : "Search projects"}
                className="mt-3"
              />
              <ul className="mt-2 flex max-h-56 flex-col overflow-y-auto" aria-label={mode === "task" ? "Task options" : "Project options"}>
                {(mode === "task" ? taskOptions : projectOptions).length === 0 && (
                  <li className="px-2 py-3 text-xs text-muted-foreground">Nothing matches.</li>
                )}
                {mode === "task"
                  ? taskOptions.map((t) => (
                      <li key={t.id}>
                        <button
                          type="button"
                          onClick={() => save([...items, { taskId: t.id, projectId: null, title: t.title }])}
                          className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-card"
                        >
                          <Plus className="size-3.5 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate">{t.title}</span>
                          {t.dueDate && <span className="shrink-0 text-[11px] text-muted-foreground">{formatShortDate(t.dueDate)}</span>}
                        </button>
                      </li>
                    ))
                  : projectOptions.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => save([...items, { taskId: null, projectId: p.id, title: p.name }])}
                          className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-card"
                        >
                          <Plus className="size-3.5 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate">{p.name}</span>
                        </button>
                      </li>
                    ))}
              </ul>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
