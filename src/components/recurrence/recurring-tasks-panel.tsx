"use client";

import * as React from "react";
import { CalendarClock, MoreHorizontal, Pause, Pencil, Play, Plus, Repeat, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { SprintDot } from "@/components/shared/sprint-badge";
import { useTaskEditor } from "@/components/tasks/task-editor-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { SPRINT_BY_ID } from "@/data/sprints";
import { relativeDayPhrase } from "@/lib/date";
import { describeRule, nextOccurrence } from "@/lib/recurrence/recurrence";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";
import type { RecurrenceStatus, RecurrenceTemplate } from "@/types";

const STATUS_STYLE: Record<RecurrenceStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  paused: { label: "Paused", className: "bg-amber-50 text-amber-800 border-amber-100" },
  ended: { label: "Ended", className: "bg-slate-100 text-slate-600 border-slate-200" },
};

type Confirm = { kind: "end" | "delete" | "pause"; template: RecurrenceTemplate };

/** Manage repeating-task series. Each occurrence is an ordinary task in the main list. */
export function RecurringTasksPanel() {
  const { workspace } = useWorkspace();
  const editor = useTaskEditor();
  const [confirm, setConfirm] = React.useState<Confirm | null>(null);
  const order: Record<RecurrenceStatus, number> = { active: 0, paused: 1, ended: 2 };
  const templates = [...workspace.recurrences].sort((a, b) => order[a.status] - order[b.status] || a.title.localeCompare(b.title));

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <h3 className="text-[15px] font-semibold">Recurring tasks</h3>
          <p className="text-xs text-muted-foreground">Each occurrence appears as a normal task a little ahead of its date.</p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => editor.openCreate({}, { repeat: true })}>
          <Plus className="size-3.5" />
          New recurring task
        </Button>
      </div>
      {templates.length === 0 ? (
        <EmptyState icon={Repeat} title="No recurring tasks" description="Add a task and choose “Repeat…” for things like weekly admin or monthly reviews." />
      ) : (
        <ul className="flex flex-col divide-y" aria-label="Recurring tasks">
          {templates.map((t) => (
            <TemplateRow key={t.id} template={t} onConfirm={setConfirm} />
          ))}
        </ul>
      )}
      {confirm && <ConfirmDialog confirm={confirm} onClose={() => setConfirm(null)} />}
    </Card>
  );
}

function TemplateRow({ template: t, onConfirm }: { template: RecurrenceTemplate; onConfirm: (c: Confirm) => void }) {
  const { workspace, actions } = useWorkspace();
  const editor = useTaskEditor();
  const project = t.projectId ? workspace.projects.find((p) => p.id === t.projectId) : null;
  const occurrences = workspace.tasks.filter((x) => x.recurrenceTemplateId === t.id);
  const done = occurrences.filter((x) => x.status === "completed").length;
  const nextOpen = occurrences
    .filter((x) => (x.status === "todo" || x.status === "in_progress") && x.occurrenceDate)
    .map((x) => x.occurrenceDate!)
    .sort()[0];
  const next = t.status === "active" ? (nextOpen ?? nextOccurrence(t, workspace.today)) : null;

  return (
    <li className={cn("flex items-start gap-3 px-4 py-3", t.status === "ended" && "opacity-70")}>
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Repeat className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => editor.openSeries(t.id)} className="cursor-pointer text-left text-[14px] font-semibold hover:text-primary">
            {t.title}
          </button>
          <Badge variant="outline" className={cn("text-[11px]", STATUS_STYLE[t.status].className)}>
            {STATUS_STYLE[t.status].label}
          </Badge>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{describeRule(t)}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {next && (
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="size-3" />
              Next {relativeDayPhrase(next, workspace.today)}
            </span>
          )}
          {t.sprintId && (
            <span className="inline-flex items-center gap-1">
              <SprintDot sprintId={t.sprintId} className="size-1.5" />
              {SPRINT_BY_ID[t.sprintId].name}
            </span>
          )}
          {project && <span className="truncate">{project.name}</span>}
          <span className="tabular-nums">{done} completed</span>
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${t.title}`}>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={() => editor.openSeries(t.id)}>
            <Pencil />
            Edit series
          </DropdownMenuItem>
          {t.status === "active" && (
            <DropdownMenuItem onSelect={() => onConfirm({ kind: "pause", template: t })}>
              <Pause />
              Pause
            </DropdownMenuItem>
          )}
          {t.status !== "active" && (
            <DropdownMenuItem
              onSelect={() => {
                actions.setRecurrenceStatus(t.id, "active");
                toast(t.status === "ended" ? "Series restarted" : "Series resumed", { description: t.title });
              }}
            >
              <Play />
              {t.status === "ended" ? "Restart" : "Resume"}
            </DropdownMenuItem>
          )}
          {t.status !== "ended" && (
            <DropdownMenuItem onSelect={() => onConfirm({ kind: "end", template: t })}>
              <Square />
              End series
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => onConfirm({ kind: "delete", template: t })} className="text-rose-700 focus:text-rose-800">
            <Trash2 className="text-rose-500" />
            Delete series…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

const COPY = {
  pause: { title: "Pause", button: "Pause series", body: "No new occurrences are created while paused. Resuming won’t back-fill the gap." },
  end: { title: "End", button: "End series", body: "No new occurrences after today. Completed history stays." },
  delete: {
    title: "Delete",
    button: "Delete series",
    body: "The repeat rule is removed. Completed occurrences stay in your history as ordinary tasks.",
  },
} as const;

function ConfirmDialog({ confirm, onClose }: { confirm: Confirm; onClose: () => void }) {
  const { workspace, actions } = useWorkspace();
  const [removeFuture, setRemoveFuture] = React.useState(false);
  const { kind, template } = confirm;
  const upcoming = workspace.tasks.filter(
    (t) => t.recurrenceTemplateId === template.id && t.occurrenceDate !== null && t.occurrenceDate >= workspace.today && t.status !== "completed",
  ).length;
  const copy = COPY[kind];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {copy.title} “{template.title}”?
          </DialogTitle>
          <DialogDescription>{copy.body}</DialogDescription>
        </DialogHeader>
        {upcoming > 0 && (
          <div className="flex items-start gap-2.5">
            <Checkbox id="remove-future" checked={removeFuture} onCheckedChange={(v) => setRemoveFuture(v === true)} className="mt-0.5" />
            <Label htmlFor="remove-future" className="text-[13px] leading-snug font-normal">
              Also remove {upcoming} upcoming unfinished {upcoming === 1 ? "occurrence" : "occurrences"}
            </Label>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className={kind === "delete" ? "bg-rose-600 hover:bg-rose-700" : undefined}
            onClick={() => {
              if (kind === "delete") actions.deleteRecurrence(template.id, { removeFuture });
              else actions.setRecurrenceStatus(template.id, kind === "pause" ? "paused" : "ended", { removeFuture });
              toast(kind === "delete" ? "Series deleted — history kept" : kind === "pause" ? "Series paused" : "Series ended", {
                description: template.title,
              });
              onClose();
            }}
          >
            {copy.button}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
