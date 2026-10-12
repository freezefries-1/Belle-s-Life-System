"use client";

import * as React from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SPRINTS } from "@/data/sprints";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/tasks/task-model";
import {
  DEFAULT_TASK_QUERY,
  viewControlsStatus,
  type DueFilter,
  type StatusFilter,
  type TaskQuery,
  type TaskSort,
} from "@/lib/tasks/task-queries";
import { cn } from "@/lib/utils";

export function isQueryFiltered(q: TaskQuery) {
  return (
    q.search.trim() !== "" ||
    q.status !== DEFAULT_TASK_QUERY.status ||
    q.sprint !== "any" ||
    q.priority !== "any" ||
    q.due !== "any"
  );
}

export function TaskFilters({
  query,
  onChange,
}: {
  query: TaskQuery;
  onChange: (patch: Partial<TaskQuery>) => void;
}) {
  const [showFilters, setShowFilters] = React.useState(false);
  const filtered = isQueryFiltered(query);
  const activeCount = [
    query.status !== DEFAULT_TASK_QUERY.status && !viewControlsStatus(query.view),
    query.sprint !== "any",
    query.priority !== "any",
    query.due !== "any",
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1 md:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle-foreground" />
          <input
            type="search"
            value={query.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="Search titles and notes…"
            aria-label="Search tasks"
            className="h-9 w-full rounded-lg border border-input bg-card pr-3 pl-9 text-[13px] shadow-xs outline-none placeholder:text-subtle-foreground focus:border-primary/60 focus:ring-[3px] focus:ring-ring/15"
          />
        </div>
        <Button
          variant="outline"
          className="gap-1.5 md:hidden"
          onClick={() => setShowFilters((s) => !s)}
          aria-expanded={showFilters}
        >
          <SlidersHorizontal className="size-4" />
          Filters
          {activeCount > 0 && (
            <span className="rounded bg-primary px-1.5 text-[10px] text-primary-foreground">{activeCount}</span>
          )}
        </Button>
        <div className="hidden flex-1 md:block" />
        <SortSelect value={query.sort} onChange={(sort) => onChange({ sort })} className="hidden md:flex" />
      </div>

      <div className={cn("flex-wrap items-center gap-2", showFilters ? "flex" : "hidden md:flex")}>
        {!viewControlsStatus(query.view) && (
          <FilterSelect
            label="Status"
            value={query.status}
            onChange={(status) => onChange({ status: status as StatusFilter })}
            options={[
              { value: "open", label: "Open (To Do + In Progress)" },
              { value: "any", label: "Any status" },
              ...TASK_STATUSES.map((s) => ({ value: s.id, label: s.label })),
            ]}
          />
        )}
        <FilterSelect
          label="Sprint"
          value={query.sprint}
          onChange={(sprint) => onChange({ sprint: sprint as TaskQuery["sprint"] })}
          options={[
            { value: "any", label: "All sprints" },
            ...SPRINTS.map((s) => ({ value: s.id, label: `Sprint ${s.number}: ${s.name}` })),
            { value: "none", label: "No sprint" },
          ]}
        />
        <FilterSelect
          label="Priority"
          value={query.priority}
          onChange={(priority) => onChange({ priority: priority as TaskQuery["priority"] })}
          options={[
            { value: "any", label: "Any priority" },
            ...TASK_PRIORITIES.map((p) => ({ value: p.id, label: p.label })),
            { value: "none", label: "No priority" },
          ]}
        />
        <FilterSelect
          label="Due date"
          value={query.due}
          onChange={(due) => onChange({ due: due as DueFilter })}
          options={[
            { value: "any", label: "Any due date" },
            { value: "overdue", label: "Overdue" },
            { value: "today", label: "Due today" },
            { value: "next7", label: "Next 7 days" },
            { value: "none", label: "No due date" },
          ]}
        />
        <SortSelect value={query.sort} onChange={(sort) => onChange({ sort })} className="md:hidden" />
        {filtered && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1"
            onClick={() =>
              onChange({
                search: "",
                status: DEFAULT_TASK_QUERY.status,
                sprint: "any",
                priority: "any",
                due: "any",
              })
            }
          >
            <X className="size-3.5" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}

export function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  const isDefault = value === options[0].value;
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        size="sm"
        aria-label={label}
        className={cn("max-w-[220px]", !isDefault && "border-primary/40 bg-accent/50 text-accent-foreground")}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const SORTS: { value: TaskSort; label: string }[] = [
  { value: "due", label: "Due date" },
  { value: "created", label: "Newest first" },
  { value: "priority", label: "Priority" },
  { value: "estimate", label: "Shortest first" },
];

function SortSelect({
  value,
  onChange,
  className,
}: {
  value: TaskSort;
  onChange: (value: TaskSort) => void;
  className?: string;
}) {
  return (
    <div className={cn("items-center gap-2", className)}>
      <span className="hidden text-xs font-medium text-muted-foreground lg:inline">Sort</span>
      <Select value={value} onValueChange={(v) => onChange(v as TaskSort)}>
        <SelectTrigger size="sm" aria-label="Sort tasks by" className="min-w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {SORTS.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
