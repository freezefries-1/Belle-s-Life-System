"use client";

import * as React from "react";
import { Info, SlidersHorizontal, X } from "lucide-react";

import { FilterSelect } from "@/components/tasks/task-filters";
import { Button } from "@/components/ui/button";
import { TASK_PRIORITIES } from "@/lib/tasks/task-model";
import {
  DEFAULT_BOARD_QUERY,
  canReorder,
  isBoardFiltered,
  type BoardDueFilter,
  type BoardQuery,
  type BoardSort,
  type BoardStatusFilter,
} from "@/lib/tasks/sprint-board";
import { cn } from "@/lib/utils";
import type { Project } from "@/types";

export function BoardToolbar({
  query,
  onChange,
  projects,
}: {
  query: BoardQuery;
  onChange: (patch: Partial<BoardQuery>) => void;
  projects: Project[];
}) {
  const [showFilters, setShowFilters] = React.useState(false);
  const filtered = isBoardFiltered(query);
  const activeCount = [query.status !== "active", query.priority !== "any", query.due !== "any", query.project !== "any"].filter(
    Boolean,
  ).length;

  return (
    <div className="mb-4 flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 md:hidden"
          onClick={() => setShowFilters((s) => !s)}
          aria-expanded={showFilters}
        >
          <SlidersHorizontal className="size-3.5" />
          Filters
          {activeCount > 0 && <span className="rounded bg-primary px-1.5 text-[10px] text-primary-foreground">{activeCount}</span>}
        </Button>
        <div className={cn("flex-wrap items-center gap-2", showFilters ? "flex" : "hidden md:flex")}>
          <FilterSelect
            label="Status"
            value={query.status}
            onChange={(v) => onChange({ status: v as BoardStatusFilter })}
            options={[
              { value: "active", label: "Active (To Do + In Progress)" },
              { value: "todo", label: "To Do" },
              { value: "in_progress", label: "In Progress" },
              { value: "skipped", label: "Skipped" },
            ]}
          />
          <FilterSelect
            label="Priority"
            value={query.priority}
            onChange={(v) => onChange({ priority: v as BoardQuery["priority"] })}
            options={[
              { value: "any", label: "Any priority" },
              ...TASK_PRIORITIES.map((p) => ({ value: p.id, label: p.label })),
              { value: "none", label: "No priority" },
            ]}
          />
          <FilterSelect
            label="Due date"
            value={query.due}
            onChange={(v) => onChange({ due: v as BoardDueFilter })}
            options={[
              { value: "any", label: "Any due date" },
              { value: "overdue", label: "Overdue" },
              { value: "today", label: "Due today" },
              { value: "next7", label: "Next 7 days" },
              { value: "none", label: "No due date" },
            ]}
          />
          <FilterSelect
            label="Project"
            value={query.project}
            onChange={(v) => onChange({ project: v })}
            options={[
              { value: "any", label: "All projects" },
              ...projects.map((p) => ({ value: p.id, label: p.name })),
              { value: "none", label: "No project" },
            ]}
          />
          {filtered && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => onChange({ status: "active", priority: "any", due: "any", project: "any" })}
            >
              <X className="size-3.5" />
              Clear
            </Button>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-xs font-medium text-muted-foreground lg:inline">Order</span>
          <FilterSelect
            label="Sort cards by"
            value={query.sort}
            onChange={(v) => onChange({ sort: v as BoardSort })}
            options={[
              { value: "manual", label: "Manual order" },
              { value: "due", label: "Due date" },
              { value: "priority", label: "Priority" },
              { value: "estimate", label: "Shortest first" },
            ]}
          />
        </div>
      </div>

      {!canReorder(query) && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-muted/70 px-3 py-2 text-xs text-muted-foreground">
          <Info className="size-3.5 shrink-0" />
          Drag to reorder is paused while filters or sorting are on. You can still move tasks with the ⋯ menu.
          <button
            type="button"
            onClick={() => onChange(DEFAULT_BOARD_QUERY)}
            className="cursor-pointer font-semibold text-primary hover:text-primary-strong"
          >
            Back to manual order
          </button>
        </p>
      )}
    </div>
  );
}
