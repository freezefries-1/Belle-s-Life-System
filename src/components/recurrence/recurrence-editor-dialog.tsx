"use client";

import * as React from "react";
import { toast } from "sonner";

import { SprintDot } from "@/components/shared/sprint-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SPRINTS } from "@/data/sprints";
import { isOpenProject } from "@/lib/projects/project-model";
import { useWorkspace } from "@/lib/store/workspace-store";
import { TASK_PRIORITIES } from "@/lib/tasks/task-model";
import { cn } from "@/lib/utils";
import type { RecurrenceRule, RecurrenceTemplate, SprintId, TaskPriority } from "@/types";

import { RuleFields } from "./rule-fields";

const NONE = "none";

/**
 * Edit a repeating task's series. Changes apply to future unfinished
 * occurrences only — past and completed ones are never rewritten.
 */
export function RecurrenceEditorDialog({
  template,
  open,
  onOpenChange,
}: {
  template: RecurrenceTemplate;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { workspace, actions } = useWorkspace();
  const [title, setTitle] = React.useState(template.title);
  const [description, setDescription] = React.useState(template.description);
  const [sprint, setSprint] = React.useState<SprintId | null>(template.sprintId);
  const [priority, setPriority] = React.useState<TaskPriority | null>(template.priority);
  const [estimate, setEstimate] = React.useState(template.estimatedMinutes != null ? String(template.estimatedMinutes) : "");
  const [projectId, setProjectId] = React.useState(template.projectId ?? NONE);
  const [rule, setRule] = React.useState<RecurrenceRule>({
    frequency: template.frequency,
    interval: template.interval,
    intervalUnit: template.intervalUnit,
    selectedWeekdays: template.selectedWeekdays,
    startDate: template.startDate,
    endDate: template.endDate,
  });
  const projects = workspace.projects.filter((p) => isOpenProject(p) || p.id === template.projectId);
  const valid = title.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(rule.startDate);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!valid) return;
    const est = estimate.trim() ? Math.round(Number(estimate)) : null;
    actions.updateRecurrence(template.id, {
      title,
      description,
      sprintId: sprint,
      priority,
      estimatedMinutes: est !== null && Number.isFinite(est) && est >= 0 ? est : null,
      projectId: projectId === NONE ? null : projectId,
      ...rule,
    });
    toast("Series updated — future occurrences follow the new settings.", { description: title.trim() });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-4 max-h-[calc(100dvh-2rem)] max-w-xl overflow-y-auto sm:top-[6%] sm:max-h-[88dvh]">
        <DialogHeader>
          <DialogTitle>Edit repeating task</DialogTitle>
          <DialogDescription>Applies to future unfinished occurrences. Completed and past ones stay exactly as they are.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="rec-title">Title</Label>
            <Input id="rec-title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="rec-desc" className="text-muted-foreground">
              Notes
            </Label>
            <Textarea id="rec-desc" value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-14" />
          </div>
          <fieldset>
            <legend className="mb-2 text-[13px] font-semibold">Repeats</legend>
            <RuleFields rule={rule} onChange={setRule} today={workspace.today} idPrefix="rec" />
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-[13px] font-semibold">Sprint</legend>
            <div className="flex flex-wrap gap-1.5">
              {[null, ...SPRINTS.map((s) => s.id)].map((id) => {
                const s = SPRINTS.find((x) => x.id === id);
                return (
                  <button
                    key={id ?? NONE}
                    type="button"
                    aria-pressed={sprint === id}
                    onClick={() => setSprint(id)}
                    className={cn(
                      "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors",
                      sprint === id ? "border-primary/40 bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {s ? (
                      <>
                        <SprintDot sprintId={s.id} />
                        {s.number}. {s.name}
                      </>
                    ) : (
                      "No sprint"
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="rec-priority">Priority</Label>
              <Select value={priority ?? NONE} onValueChange={(v) => setPriority(v === NONE ? null : (v as TaskPriority))}>
                <SelectTrigger id="rec-priority" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {TASK_PRIORITIES.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="rec-est">Estimate (min)</Label>
              <Input id="rec-est" type="number" min={0} value={estimate} onChange={(e) => setEstimate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="rec-project">Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger id="rec-project" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No project</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid}>
              Save series
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
