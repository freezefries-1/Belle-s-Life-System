"use client";

import * as React from "react";
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
import { MILESTONE_STATUSES } from "@/lib/projects/project-model";
import { useWorkspaceActions } from "@/lib/store/workspace-store";
import type { Milestone, MilestoneStatus } from "@/types";

import { DateWithPrep } from "./date-with-prep";

export function MilestoneEditorDialog({
  projectId,
  milestone,
  open,
  onOpenChange,
}: {
  projectId: string;
  milestone?: Milestone;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const actions = useWorkspaceActions();
  const [title, setTitle] = React.useState(milestone?.title ?? "");
  const [description, setDescription] = React.useState(milestone?.description ?? "");
  const [target, setTarget] = React.useState(milestone?.targetDate ?? "");
  const [prep, setPrep] = React.useState(milestone?.preparationDate ?? "");
  const [status, setStatus] = React.useState<MilestoneStatus>(milestone?.status ?? "upcoming");
  const valid = title.trim().length > 0;

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!valid) return;
    const input = { title, description, targetDate: target || null, preparationDate: prep || null, status };
    if (milestone) actions.updateMilestone(milestone.id, input);
    else actions.createMilestone(projectId, input);
    toast(milestone ? "Milestone updated" : "Milestone added", { description: title.trim() });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-4 max-h-[calc(100dvh-2rem)] max-w-lg overflow-y-auto sm:top-[8%]">
        <DialogHeader>
          <DialogTitle>{milestone ? "Edit milestone" : "New milestone"}</DialogTitle>
          <DialogDescription>An important checkpoint or deliverable in this project.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ms-title">Title</Label>
            <Input id="ms-title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Registration closes" maxLength={200} autoComplete="off" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ms-description" className="text-muted-foreground">
              Description
            </Label>
            <Textarea id="ms-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" className="min-h-14" />
          </div>
          <DateWithPrep idPrefix="ms" targetLabel="Date" target={target} prep={prep} onTarget={setTarget} onPrep={setPrep} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="ms-status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as MilestoneStatus)}>
              <SelectTrigger id="ms-status" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MILESTONE_STATUSES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid}>
              {milestone ? "Save changes" : "Add milestone"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
