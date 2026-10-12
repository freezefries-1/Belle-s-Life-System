"use client";

import * as React from "react";
import { ChevronDown, Inbox, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { RuleFields, defaultRule } from "@/components/recurrence/rule-fields";
import { SprintDot } from "@/components/shared/sprint-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SPRINTS } from "@/data/sprints";
import { addDays, formatClockTime, isValidISODate, localDateOf, relativeDayLabel } from "@/lib/date";
import { isOpenProject, milestonesOrdered } from "@/lib/projects/project-model";
import { describeRule } from "@/lib/recurrence/recurrence";
import { useWorkspace } from "@/lib/store/workspace-store";
import { ESTIMATE_PRESETS, TASK_PRIORITIES, TASK_STATUSES } from "@/lib/tasks/task-model";
import { cn, formatMinutes } from "@/lib/utils";
import type { RecurrenceRule, SprintId, TaskInput, TaskPriority, TaskStatus } from "@/types";

import { useTaskFeedback } from "./use-task-feedback";

export type TaskEditorTarget =
  | { mode: "create"; defaults?: Partial<TaskInput>; repeat?: boolean }
  | { mode: "edit"; taskId: string }
  | { mode: "convert"; captureId: string };

interface FormState {
  title: string;
  description: string;
  sprint: SprintId | null;
  dueDate: string;
  priority: TaskPriority | null;
  estimatedMinutes: string;
  actualMinutes: string;
  projectId: string;
  milestoneId: string;
  status: TaskStatus;
  /** Create mode only: make this a repeating task. */
  repeat: boolean;
  rule: RecurrenceRule;
}

const NONE = "none";

const toMinutes = (v: string) => {
  const n = Number(v);
  return v.trim() && Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
};

export function TaskEditorDialog({
  target,
  open,
  onOpenChange,
  onEditSeries,
}: {
  target: TaskEditorTarget;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Open the series editor for a repeating task's template. */
  onEditSeries?: (templateId: string) => void;
}) {
  const { workspace, actions } = useWorkspace();
  const feedback = useTaskFeedback();

  const task = target.mode === "edit" ? workspace.tasks.find((t) => t.id === target.taskId) : undefined;
  const capture = target.mode === "convert" ? workspace.captures.find((c) => c.id === target.captureId) : undefined;

  const [form, setForm] = React.useState<FormState>(() => {
    const base: Partial<TaskInput> =
      target.mode === "edit"
        ? (task ?? {})
        : target.mode === "convert"
          ? { title: capture?.title ?? "", description: capture?.note ?? "" }
          : (target.defaults ?? {});
    return {
      title: base.title ?? "",
      description: base.description ?? "",
      sprint: base.sprint ?? null,
      dueDate: base.dueDate ?? "",
      priority: base.priority ?? null,
      estimatedMinutes: base.estimatedMinutes != null ? String(base.estimatedMinutes) : "",
      actualMinutes: base.actualMinutes != null ? String(base.actualMinutes) : "",
      projectId: base.projectId ?? NONE,
      milestoneId: base.milestoneId ?? NONE,
      status: base.status ?? "todo",
      repeat: target.mode === "create" && !!target.repeat,
      rule: defaultRule(base.dueDate || workspace.today),
    };
  });

  // Progressive disclosure: extra fields stay tucked away unless already in use.
  const [showMore, setShowMore] = React.useState(
    () =>
      target.mode === "edit" &&
      !!task &&
      (task.priority !== null ||
        task.estimatedMinutes !== null ||
        task.projectId !== null ||
        task.status !== "todo" ||
        task.actualMinutes !== null),
  );

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const template = task?.recurrenceTemplateId ? workspace.recurrences.find((r) => r.id === task.recurrenceTemplateId) : undefined;
  const projectOptions = workspace.projects.filter((p) => isOpenProject(p) || p.id === form.projectId);
  const milestoneOptions = form.projectId === NONE ? [] : milestonesOrdered(workspace.milestones, form.projectId);
  const titleValid = form.title.trim().length > 0 && (!form.repeat || isValidISODate(form.rule.startDate));
  const missing = (target.mode === "edit" && !task) || (target.mode === "convert" && !capture);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!titleValid) return;
    const input: TaskInput = {
      title: form.title,
      description: form.description,
      sprint: form.sprint,
      dueDate: form.dueDate || null,
      priority: form.priority,
      estimatedMinutes: toMinutes(form.estimatedMinutes),
      actualMinutes: toMinutes(form.actualMinutes),
      projectId: form.projectId === NONE ? null : form.projectId,
      milestoneId: form.milestoneId === NONE ? null : form.milestoneId,
      status: form.status,
    };

    if (target.mode === "create" && form.repeat) {
      const created = actions.createRecurrence({
        title: input.title,
        description: input.description,
        sprintId: input.sprint ?? null,
        projectId: input.projectId ?? null,
        priority: input.priority ?? null,
        estimatedMinutes: input.estimatedMinutes ?? null,
        ...form.rule,
      });
      if (created) toast("Repeating task created", { description: describeRule(created) });
    } else if (target.mode === "create") {
      const created = actions.createTask(input);
      if (created) toast("Task created", { description: created.title });
    } else if (target.mode === "edit" && task) {
      actions.updateTask(task.id, input);
      toast("Task updated", { description: input.title.trim() });
    } else if (target.mode === "convert" && capture) {
      const created = actions.convertCapture(capture.id, input);
      if (created) toast("Converted to a task", { description: created.title });
      else toast("This entry has already been converted.");
    }
    onOpenChange(false);
  }

  const copy = {
    create: { title: "New task", description: "Just a title is enough. Add details now or later.", submit: "Create task" },
    edit: { title: "Edit task", description: "Changes save straight away to this browser.", submit: "Save changes" },
    convert: { title: "Convert to task", description: "Give it a little shape. Everything except the title is optional.", submit: "Convert to task" },
  }[target.mode];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-4 max-h-[calc(100dvh-2rem)] max-w-xl overflow-y-auto sm:top-[8%] sm:max-h-[84dvh]">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        {missing ? (
          <p className="text-[13px] text-muted-foreground">This item no longer exists — it may have been deleted.</p>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
            {template && (
              <div className="flex flex-col gap-2 rounded-lg border border-dashed px-3 py-2.5 text-xs sm:flex-row sm:items-center">
                <Repeat className="size-3.5 shrink-0 text-primary" />
                <p className="min-w-0 flex-1 text-muted-foreground">
                  One occurrence of a repeating task ({describeRule(template).toLowerCase()}). Changes here apply to{" "}
                  <span className="font-semibold text-foreground">this occurrence only</span>.
                </p>
                {onEditSeries && (
                  <Button type="button" variant="outline" size="xs" onClick={() => onEditSeries(template.id)}>
                    Edit future occurrences
                  </Button>
                )}
              </div>
            )}

            {capture && (
              <p className="flex items-center gap-2 rounded-lg bg-muted/70 px-3 py-2 text-xs text-muted-foreground">
                <Inbox className="size-3.5 shrink-0" />
                From your Brain Dump · captured {relativeDayLabel(localDateOf(capture.createdAt), workspace.today).toLowerCase()} at{" "}
                {formatClockTime(capture.createdAt)}
              </p>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="task-title">
                Title <span className="sr-only">(required)</span>
              </Label>
              <Input
                id="task-title"
                autoFocus
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="What needs doing?"
                aria-required="true"
                aria-invalid={!titleValid && form.title.length > 0}
                className="h-10 text-[14px]"
                autoComplete="off"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="task-description" className="text-muted-foreground">
                Notes
              </Label>
              <Textarea
                id="task-description"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
                }}
                placeholder="Any details, links or next steps (optional)"
                className="min-h-16"
              />
            </div>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-[13px] font-semibold">Sprint</legend>
              <div className="flex flex-wrap gap-1.5">
                {[null, ...SPRINTS.map((s) => s.id)].map((id) => {
                  const sprint = SPRINTS.find((s) => s.id === id);
                  const selected = form.sprint === id;
                  return (
                    <button
                      key={id ?? NONE}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => set("sprint", id)}
                      className={cn(
                        "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none",
                        selected
                          ? "border-primary/40 bg-accent text-accent-foreground"
                          : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {sprint ? (
                        <>
                          <SprintDot sprintId={sprint.id} />
                          {sprint.number}. {sprint.name}
                        </>
                      ) : (
                        "No sprint"
                      )}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {form.repeat ? (
              <fieldset className="rounded-xl border bg-muted/30 p-3.5">
                <div className="mb-3 flex items-center justify-between">
                  <legend className="flex items-center gap-1.5 text-[13px] font-semibold">
                    <Repeat className="size-3.5 text-primary" />
                    Repeats
                  </legend>
                  <Button type="button" variant="ghost" size="xs" onClick={() => set("repeat", false)}>
                    Don’t repeat
                  </Button>
                </div>
                <RuleFields rule={form.rule} onChange={(rule) => set("rule", rule)} today={workspace.today} idPrefix="task-rule" />
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Each date becomes its own task. Upcoming ones appear a little ahead of time.
                </p>
              </fieldset>
            ) : (
            <div className="flex flex-col gap-2">
              <Label htmlFor="task-due">Due date</Label>
              <div className="flex flex-wrap items-center gap-1.5">
                <Input
                  id="task-due"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => set("dueDate", e.target.value)}
                  className="w-44"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => set("dueDate", workspace.today)}>
                  Today
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => set("dueDate", addDays(workspace.today, 1))}
                >
                  Tomorrow
                </Button>
                {form.dueDate && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => set("dueDate", "")}>
                    Clear
                  </Button>
                )}
                {target.mode === "create" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1"
                    onClick={() => setForm((f) => ({ ...f, repeat: true, rule: defaultRule(f.dueDate || workspace.today) }))}
                  >
                    <Repeat className="size-3.5" />
                    Repeat…
                  </Button>
                )}
              </div>
            </div>
            )}

            <div className="rounded-xl border bg-muted/30">
              <button
                type="button"
                aria-expanded={showMore}
                onClick={() => setShowMore((s) => !s)}
                className="flex w-full cursor-pointer items-center justify-between rounded-xl px-3.5 py-2.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
              >
                More details
                <span className="flex items-center gap-2 text-xs font-medium">
                  {!showMore && "Priority, time, project, status"}
                  <ChevronDown className={cn("size-4 transition-transform", showMore && "rotate-180")} />
                </span>
              </button>

              {showMore && (
                <div className="grid grid-cols-1 gap-5 border-t px-3.5 pt-4 pb-4 sm:grid-cols-2">
                  <fieldset className="sm:col-span-2">
                    <legend className="mb-2 text-[13px] font-semibold">Priority</legend>
                    <div className="inline-flex flex-wrap rounded-lg bg-muted p-1" role="radiogroup" aria-label="Priority">
                      {[{ id: null, label: "None" }, ...[...TASK_PRIORITIES].reverse()].map((p) => (
                        <button
                          key={p.id ?? NONE}
                          type="button"
                          role="radio"
                          aria-checked={form.priority === p.id}
                          onClick={() => set("priority", p.id)}
                          className={cn(
                            "h-7 cursor-pointer rounded-md px-3 text-xs font-semibold text-muted-foreground transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none",
                            form.priority === p.id && "bg-card text-foreground shadow-sm",
                          )}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <div className="flex flex-col gap-2 sm:col-span-2">
                    <Label htmlFor="task-estimate">Estimated time (minutes)</Label>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Input
                        id="task-estimate"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={5}
                        value={form.estimatedMinutes}
                        onChange={(e) => set("estimatedMinutes", e.target.value)}
                        placeholder="e.g. 30"
                        className="w-24"
                      />
                      {ESTIMATE_PRESETS.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => set("estimatedMinutes", String(m))}
                          className={cn(
                            "h-7 cursor-pointer rounded-md border px-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none",
                            form.estimatedMinutes === String(m) && "border-primary/40 bg-accent text-accent-foreground",
                          )}
                        >
                          {formatMinutes(m)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="task-project">Project</Label>
                    <Select value={form.projectId} onValueChange={(v) => setForm((f) => ({ ...f, projectId: v, milestoneId: NONE }))}>
                      <SelectTrigger id="task-project" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>No project</SelectItem>
                        {projectOptions.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {milestoneOptions.length > 0 && !form.repeat && (
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="task-milestone">Milestone</Label>
                      <Select value={form.milestoneId} onValueChange={(v) => set("milestoneId", v)}>
                        <SelectTrigger id="task-milestone" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>No milestone</SelectItem>
                          {milestoneOptions.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="task-status">Status</Label>
                    <Select value={form.status} onValueChange={(v) => set("status", v as TaskStatus)}>
                      <SelectTrigger id="task-status" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TASK_STATUSES.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {target.mode === "edit" && (
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="task-actual">Actual time (minutes)</Label>
                      <Input
                        id="task-actual"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={5}
                        value={form.actualMinutes}
                        onChange={(e) => set("actualMinutes", e.target.value)}
                        placeholder="Optional"
                        className="w-28"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="sm:justify-between">
              {target.mode === "edit" && task ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="gap-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  onClick={() => {
                    feedback.remove(task);
                    onOpenChange(false);
                  }}
                >
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              ) : (
                <span className="hidden text-xs text-muted-foreground sm:block">Press Enter to save</span>
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!titleValid}>
                  {copy.submit}
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
