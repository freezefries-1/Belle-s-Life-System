"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

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
import { CATEGORY_SUGGESTIONS, PROJECT_COLOURS, PROJECT_ICONS, PROJECT_STATUSES } from "@/lib/projects/project-model";
import { useWorkspaceActions } from "@/lib/store/workspace-store";
import { TASK_PRIORITIES } from "@/lib/tasks/task-model";
import { cn } from "@/lib/utils";
import type { Project, ProjectColour, ProjectIcon, ProjectStatus, TaskPriority } from "@/types";

import { DateWithPrep } from "./date-with-prep";
import { COLOUR_STYLES, PROJECT_ICON_COMPONENTS } from "./project-visuals";

const NONE = "none";

/** Create or edit a project. Only the name is required; the rest is tucked under "More details". */
export function ProjectEditorDialog({
  project,
  open,
  onOpenChange,
  openAfterCreate = true,
}: {
  project?: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  openAfterCreate?: boolean;
}) {
  const actions = useWorkspaceActions();
  const router = useRouter();
  const [name, setName] = React.useState(project?.name ?? "");
  const [description, setDescription] = React.useState(project?.description ?? "");
  const [status, setStatus] = React.useState<ProjectStatus>(project?.status ?? "active");
  const [priority, setPriority] = React.useState<TaskPriority | null>(project?.priority ?? null);
  const [category, setCategory] = React.useState(project?.category ?? "");
  const [startDate, setStartDate] = React.useState(project?.startDate ?? "");
  const [targetDate, setTargetDate] = React.useState(project?.targetDate ?? "");
  const [prepDate, setPrepDate] = React.useState(project?.preparationDate ?? "");
  const [colour, setColour] = React.useState<ProjectColour>(project?.colour ?? "blue");
  const [icon, setIcon] = React.useState<ProjectIcon>(project?.icon ?? "folder");
  const [showMore, setShowMore] = React.useState(!!project);
  const valid = name.trim().length > 0;

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!valid) return;
    const input = {
      name,
      description,
      status,
      priority,
      category,
      startDate: startDate || null,
      targetDate: targetDate || null,
      preparationDate: prepDate || null,
      colour,
      icon,
    };
    if (project) {
      actions.updateProject(project.id, input);
      toast("Your changes have been saved.", { description: name.trim() });
      onOpenChange(false);
    } else {
      const created = actions.createProject(input);
      onOpenChange(false);
      if (created) {
        toast("Project created", { description: created.name });
        if (openAfterCreate) router.push(`/projects/${created.id}`);
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-4 max-h-[calc(100dvh-2rem)] max-w-xl overflow-y-auto sm:top-[6%] sm:max-h-[88dvh]">
        <DialogHeader>
          <DialogTitle>{project ? "Edit project" : "New project"}</DialogTitle>
          <DialogDescription>A name is enough to start. Add dates and details whenever you like.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-name">Project name</Label>
            <Input id="project-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Evolve Tennis Ladder Tournament" maxLength={200} autoComplete="off" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-description" className="text-muted-foreground">
              Description
            </Label>
            <Textarea id="project-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does done look like?" className="min-h-14" />
          </div>
          <DateWithPrep idPrefix="project" target={targetDate} prep={prepDate} onTarget={setTargetDate} onPrep={setPrepDate} />

          <div className="rounded-xl border bg-muted/30">
            <button
              type="button"
              aria-expanded={showMore}
              onClick={() => setShowMore((s) => !s)}
              className="flex w-full cursor-pointer items-center justify-between rounded-xl px-3.5 py-2.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
            >
              More details
              <span className="flex items-center gap-2 text-xs font-medium">
                {!showMore && "Status, priority, area, start date, look"}
                <ChevronDown className={cn("size-4 transition-transform", showMore && "rotate-180")} />
              </span>
            </button>
            {showMore && (
              <div className="grid grid-cols-1 gap-5 border-t px-3.5 pt-4 pb-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="project-status">Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
                    <SelectTrigger id="project-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_STATUSES.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="project-priority">Priority</Label>
                  <Select value={priority ?? NONE} onValueChange={(v) => setPriority(v === NONE ? null : (v as TaskPriority))}>
                    <SelectTrigger id="project-priority" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>No priority</SelectItem>
                      {TASK_PRIORITIES.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="project-category">Life area</Label>
                  <Input id="project-category" list="project-categories" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Optional" />
                  <datalist id="project-categories">
                    {CATEGORY_SUGGESTIONS.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="project-start">Start date</Label>
                  <Input id="project-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-44" />
                </div>
                <fieldset className="sm:col-span-2">
                  <legend className="mb-2 text-[13px] font-semibold">Colour & icon</legend>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {PROJECT_COLOURS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`Colour ${c}`}
                        aria-pressed={colour === c}
                        onClick={() => setColour(c)}
                        className={cn(
                          "size-7 cursor-pointer rounded-full ring-offset-2 transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                          COLOUR_STYLES[c].dot,
                          colour === c && "ring-2 ring-foreground/60",
                        )}
                      />
                    ))}
                    <span className="mx-1 h-6 w-px bg-border" aria-hidden />
                    {PROJECT_ICONS.map((i) => {
                      const Icon = PROJECT_ICON_COMPONENTS[i];
                      return (
                        <button
                          key={i}
                          type="button"
                          aria-label={`Icon ${i}`}
                          aria-pressed={icon === i}
                          onClick={() => setIcon(i)}
                          className={cn(
                            "flex size-8 cursor-pointer items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                            icon === i && "border-primary/50 bg-accent text-accent-foreground",
                          )}
                        >
                          <Icon className="size-4" />
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid}>
              {project ? "Save changes" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
