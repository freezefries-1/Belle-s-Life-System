"use client";

import * as React from "react";
import { History, Plus, Search, Star } from "lucide-react";
import { toast } from "sonner";

import { SprintBadge } from "@/components/shared/sprint-badge";
import { DueLabel } from "@/components/shared/task-meta";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getHighlightFor, getUnfinishedYesterday } from "@/lib/daily/day";
import { useWorkspace } from "@/lib/store/workspace-store";
import { isActive } from "@/lib/tasks/task-model";
import { matchesSearch, sortTasks } from "@/lib/tasks/task-queries";
import { cn, formatMinutes } from "@/lib/utils";
import type { Task } from "@/types";

/** Pick today's one priority: an existing task (by reference) or a brand-new one. */
export function HighlightPickerDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { workspace, actions } = useWorkspace();
  const current = getHighlightFor(workspace, workspace.today);
  const yesterday = getUnfinishedYesterday(workspace, workspace.today);
  const [selected, setSelected] = React.useState<string | null>(current?.taskId ?? null);
  const [query, setQuery] = React.useState("");
  const [newTitle, setNewTitle] = React.useState("");

  const open_ = sortTasks(workspace.tasks.filter(isActive), "due").filter((t) => matchesSearch(t, query));
  const dueToday = open_.filter((t) => t.dueDate === workspace.today);
  const others = open_.filter((t) => t.dueDate !== workspace.today);

  function choose(task: Task) {
    actions.setHighlight(task.id);
    toast("Today’s highlight is set", { description: task.title });
    onOpenChange(false);
  }

  function createAndChoose(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const task = actions.createHighlightTask({ title: newTitle });
    if (task) toast("New task created as today’s highlight", { description: task.title });
    onOpenChange(false);
  }

  const row = (t: Task) => (
    <li key={t.id}>
      <button
        type="button"
        role="radio"
        aria-checked={selected === t.id}
        onClick={() => setSelected(t.id)}
        onDoubleClick={() => choose(t)}
        className={cn(
          "flex w-full cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none",
          selected === t.id ? "border-primary/40 bg-accent" : "border-transparent hover:bg-muted",
        )}
      >
        <span
          className={cn(
            "flex size-4 shrink-0 items-center justify-center rounded-full border",
            selected === t.id ? "border-primary bg-primary" : "border-slate-300",
          )}
        >
          {selected === t.id && <span className="size-1.5 rounded-full bg-white" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] leading-snug font-medium">{t.title}</span>
          <span className="mt-0.5 flex flex-wrap gap-x-2.5 gap-y-0.5">
            <SprintBadge sprintId={t.sprint} />
            <DueLabel due={t.dueDate} today={workspace.today} />
          </span>
        </span>
        {t.estimatedMinutes != null && (
          <span className="shrink-0 text-xs text-muted-foreground">{formatMinutes(t.estimatedMinutes)}</span>
        )}
      </button>
    </li>
  );

  const selectedTask = workspace.tasks.find((t) => t.id === selected);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-4 max-h-[calc(100dvh-2rem)] max-w-lg overflow-y-auto sm:top-[6%] sm:max-h-[88dvh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="size-4 fill-amber-400 text-amber-400" />
            Choose today’s highlight
          </DialogTitle>
          <DialogDescription>
            The one thing that would make today feel productive — not necessarily the most urgent.
          </DialogDescription>
        </DialogHeader>

        {yesterday && (
          <div className="flex flex-col gap-2 rounded-lg border border-dashed px-3 py-2.5 sm:flex-row sm:items-center">
            <History className="size-4 shrink-0 text-muted-foreground" />
            <p className="min-w-0 flex-1 text-[13px]">
              <span className="text-muted-foreground">Yesterday’s highlight is still open: </span>
              <span className="font-semibold">{yesterday.title}</span>
            </p>
            <Button size="xs" variant="outline" onClick={() => choose(yesterday)}>
              Make it today’s
            </Button>
          </div>
        )}

        <form onSubmit={createAndChoose} className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Plus className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle-foreground" />
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Something new? Type it here"
              aria-label="New task title"
              className="h-9 w-full rounded-lg border border-input bg-card pr-3 pl-9 text-[13px] shadow-xs outline-none placeholder:text-subtle-foreground focus:border-primary/60 focus:ring-[3px] focus:ring-ring/15"
            />
          </div>
          <Button type="submit" size="sm" variant="outline" disabled={!newTitle.trim()}>
            Create
          </Button>
        </form>

        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="…or pick from your open tasks"
              aria-label="Search open tasks"
              className="h-9 w-full rounded-lg border border-input bg-card pr-3 pl-9 text-[13px] shadow-xs outline-none placeholder:text-subtle-foreground focus:border-primary/60 focus:ring-[3px] focus:ring-ring/15"
            />
          </div>
          {open_.length === 0 ? (
            <p className="rounded-lg bg-muted/60 px-3 py-4 text-center text-[13px] text-muted-foreground">
              {query ? "No open tasks match." : "No open tasks yet — type a new one above."}
            </p>
          ) : (
            <div className="-mx-1 max-h-[40vh] overflow-y-auto px-1" role="radiogroup" aria-label="Open tasks">
              {dueToday.length > 0 && (
                <>
                  <p className="px-1 pt-1 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Due today</p>
                  <ul>{dueToday.map(row)}</ul>
                </>
              )}
              {others.length > 0 && (
                <>
                  {dueToday.length > 0 && (
                    <p className="px-1 pt-3 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                      Other open tasks
                    </p>
                  )}
                  <ul>{others.map(row)}</ul>
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!selectedTask || selected === current?.taskId} onClick={() => selectedTask && choose(selectedTask)}>
            Set as highlight
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
