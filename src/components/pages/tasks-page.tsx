"use client";

import * as React from "react";
import { ListChecks, Search, Star } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SprintBadge } from "@/components/shared/sprint-badge";
import { CarriedOverLabel, DueLabel, StatusBadge } from "@/components/shared/task-meta";
import { TaskActionsMenu } from "@/components/shared/task-actions-menu";
import { TaskRow } from "@/components/shared/task-row";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SPRINTS } from "@/data/sprints";
import { relativeDayPhrase } from "@/lib/date";
import { getProject, isCarriedOver } from "@/lib/selectors";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn, formatMinutes } from "@/lib/utils";
import type { Task, TaskStatus } from "@/types";

type StatusFilter = "open" | TaskStatus | "all";

export function TasksPage() {
  const { workspace } = useWorkspace();
  const [status, setStatus] = React.useState<StatusFilter>("open");
  const [sprint, setSprint] = React.useState("all");
  const [project, setProject] = React.useState("all");
  const [query, setQuery] = React.useState("");

  const tasks = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return workspace.tasks
      .filter((t) => {
        if (status === "open" && t.status === "done") return false;
        if (status !== "open" && status !== "all" && t.status !== status) return false;
        if (sprint !== "all" && t.sprintId !== sprint) return false;
        if (project !== "all" && (t.projectId ?? "none") !== project) return false;
        if (q && !t.title.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        const rank = { in_progress: 0, todo: 1, done: 2 } as const;
        if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
        if (a.status === "done") return (b.completedDate ?? "").localeCompare(a.completedDate ?? "");
        return (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
      });
  }, [workspace.tasks, status, sprint, project, query]);

  const openMinutes = tasks.filter((t) => t.status !== "done").reduce((s, t) => s + (t.estimateMinutes ?? 0), 0);

  return (
    <>
      <PageHeader
        title="Tasks"
        description="Every task in one place. Filter down to just what you need right now."
      />

      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <Tabs value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <TabsList>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="in_progress">In progress</TabsTrigger>
            <TabsTrigger value="done">Done</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-56">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter tasks…"
              aria-label="Filter tasks"
              className="h-8 w-full rounded-lg border border-input bg-card pr-3 pl-9 text-[13px] shadow-xs outline-none placeholder:text-subtle-foreground focus:border-primary/60 focus:ring-[3px] focus:ring-ring/15"
            />
          </div>
          <Select value={sprint} onValueChange={setSprint}>
            <SelectTrigger size="sm" aria-label="Filter by sprint" className="min-w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sprints</SelectItem>
              {SPRINTS.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  Sprint {s.number}: {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={project} onValueChange={setProject}>
            <SelectTrigger size="sm" aria-label="Filter by project" className="min-w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {workspace.projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
              <SelectItem value="none">No project</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b px-4 py-2.5 text-xs text-muted-foreground">
          <span className="tabular-nums">
            {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
          </span>
          {openMinutes > 0 && <span className="tabular-nums">≈ {formatMinutes(openMinutes)} of open work</span>}
        </div>

        {tasks.length === 0 ? (
          <EmptyState icon={ListChecks} title="No tasks match" description="Try a different filter." />
        ) : (
          <>
            {/* Mobile: compact rows */}
            <div className="flex flex-col p-2 md:hidden">
              {tasks.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </div>
            {/* Desktop: table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10" />
                    <TableHead>Task</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sprint</TableHead>
                    <TableHead className="hidden lg:table-cell">Project</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead className="text-right">Estimate</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((t) => (
                    <TaskTableRow key={t.id} task={t} />
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </Card>
    </>
  );
}

function TaskTableRow({ task }: { task: Task }) {
  const { workspace, actions } = useWorkspace();
  const project = getProject(workspace, task.projectId);
  const done = task.status === "done";

  return (
    <TableRow className="group">
      <TableCell className="pr-0">
        <Checkbox checked={done} onCheckedChange={() => actions.toggleTask(task.id)} aria-label={`Toggle “${task.title}”`} />
      </TableCell>
      <TableCell className="max-w-[340px] whitespace-normal">
        <div className="flex items-center gap-1.5">
          {workspace.highlightTaskId === task.id && <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />}
          <span className={cn("font-medium", done && "text-muted-foreground line-through decoration-slate-300")}>
            {task.title}
          </span>
        </div>
        {isCarriedOver(task, workspace.today) && <CarriedOverLabel className="mt-0.5" />}
      </TableCell>
      <TableCell>
        <StatusBadge status={task.status} />
      </TableCell>
      <TableCell>
        <SprintBadge sprintId={task.sprintId} />
      </TableCell>
      <TableCell className="hidden max-w-[200px] truncate text-muted-foreground lg:table-cell">
        {project?.name ?? "—"}
      </TableCell>
      <TableCell>
        {done ? (
          <span className="text-xs text-muted-foreground">
            Done {task.completedDate ? relativeDayPhrase(task.completedDate, workspace.today) : ""}
          </span>
        ) : task.dueDate ? (
          <DueLabel due={task.dueDate} today={workspace.today} />
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-right text-muted-foreground tabular-nums">{formatMinutes(task.estimateMinutes)}</TableCell>
      <TableCell className="pl-0">
        <TaskActionsMenu task={task} />
      </TableCell>
    </TableRow>
  );
}
