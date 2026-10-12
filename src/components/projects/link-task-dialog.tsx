"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";

import { SprintBadge } from "@/components/shared/sprint-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getProject } from "@/lib/selectors";
import { useWorkspace } from "@/lib/store/workspace-store";
import { isActive } from "@/lib/tasks/task-model";
import { matchesSearch, sortTasks } from "@/lib/tasks/task-queries";
import { cn } from "@/lib/utils";

/** Pick existing tasks to link to this project. A task belongs to one project at a time. */
export function LinkTaskDialog({ projectId, open, onOpenChange }: { projectId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { workspace, actions } = useWorkspace();
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<string[]>([]);
  const candidates = sortTasks(
    workspace.tasks.filter((t) => t.projectId !== projectId && isActive(t) && matchesSearch(t, query)),
    "due",
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-4 max-h-[calc(100dvh-2rem)] max-w-lg overflow-y-auto sm:top-[8%]">
        <DialogHeader>
          <DialogTitle>Link existing tasks</DialogTitle>
          <DialogDescription>Tasks already in another project will move to this one.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle-foreground" />
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search open tasks"
            aria-label="Search open tasks"
            className="h-9 w-full rounded-lg border border-input bg-card pr-3 pl-9 text-[13px] shadow-xs outline-none placeholder:text-subtle-foreground focus:border-primary/60 focus:ring-[3px] focus:ring-ring/15"
          />
        </div>
        {candidates.length === 0 ? (
          <p className="rounded-lg bg-muted/60 px-3 py-4 text-center text-[13px] text-muted-foreground">No other open tasks{query ? " match" : ""}.</p>
        ) : (
          <ul className="-mx-1 flex max-h-[45vh] flex-col overflow-y-auto px-1" aria-label="Open tasks">
            {candidates.map((t) => {
              const on = selected.includes(t.id);
              const other = getProject(workspace, t.projectId);
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => setSelected((s) => (on ? s.filter((x) => x !== t.id) : [...s, t.id]))}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none",
                      on ? "border-primary/40 bg-accent" : "border-transparent hover:bg-muted",
                    )}
                  >
                    <span className={cn("flex size-4 shrink-0 items-center justify-center rounded-[4px] border", on ? "border-primary bg-primary text-white" : "border-slate-300")}>
                      {on && <span className="text-[10px] leading-none">✓</span>}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium">{t.title}</span>
                      <span className="mt-0.5 flex flex-wrap gap-x-2.5 text-xs text-muted-foreground">
                        <SprintBadge sprintId={t.sprint} />
                        {other && <span>In {other.name}</span>}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={selected.length === 0}
            onClick={() => {
              selected.forEach((id) => actions.linkTaskToProject(id, projectId));
              toast(`${selected.length} ${selected.length === 1 ? "task" : "tasks"} linked`);
              onOpenChange(false);
            }}
          >
            Link {selected.length || ""} {selected.length === 1 ? "task" : "tasks"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
