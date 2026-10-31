"use client";

import * as React from "react";
import { Plus, RotateCcw, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createId } from "@/lib/id";
import { stageInUse } from "@/lib/store/changes/ladder";
import { useWorkspace } from "@/lib/store/workspace-store";
import { builtInStage, type StageDef } from "@/lib/students/ladder";
import { useLadder } from "@/lib/students/use-ladder";
import type { TrackId } from "@/types";

type Row = { key: string; id?: string; text: string };

/** Edit a stage's name, focus and milestones — or add a new stage at the end of a track (no `stage`). */
export function StageEditorDialog({
  track,
  stage,
  open,
  onOpenChange,
}: {
  track: TrackId;
  stage?: StageDef;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { workspace, actions } = useWorkspace();
  const ladder = useLadder();
  const t = ladder[track];
  const [name, setName] = React.useState(stage?.name ?? "");
  const [focus, setFocus] = React.useState(stage?.focus ?? "");
  const [rows, setRows] = React.useState<Row[]>(() =>
    stage?.checks.length ? stage.checks.map((c) => ({ key: c.id, id: c.id, text: c.text })) : [{ key: createId(), text: "" }],
  );
  const lastRef = React.useRef<HTMLInputElement>(null);
  const valid = name.trim().length > 0;

  const isLast = stage && t.stages.at(-1)?.id === stage.id;
  const inUse = stage ? stageInUse(workspace, track, stage.id) : false;
  const original = stage?.builtIn ? builtInStage(track, stage.id) : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    const input = { name, focus, checks: rows.map((r) => ({ id: r.id, text: r.text })) };
    if (stage) {
      actions.saveLadderStage(track, stage.id, input);
      toast(`${stage.id} saved`, { description: name.trim() });
    } else {
      const id = actions.addLadderStage(track, input);
      if (id) toast(`${id} added to ${t.name}`, { description: name.trim() });
    }
    onOpenChange(false);
  }

  function remove() {
    if (!stage) return;
    const removed = actions.removeLadderStage(track, stage.id);
    onOpenChange(false);
    if (removed)
      toast(stage.builtIn ? `${stage.id} reset to the original wording` : `${stage.id} deleted`, {
        description: removed.name,
        action: { label: "Undo", onClick: () => actions.restoreLadderStage(removed) },
      });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-4 max-h-[calc(100dvh-2rem)] max-w-lg overflow-y-auto sm:top-[6%] sm:max-h-[88dvh]">
        <DialogHeader>
          <DialogTitle>{stage ? `${t.name}: edit ${stage.id}` : `${t.name}: new stage`}</DialogTitle>
          <DialogDescription>
            {stage
              ? "Rewording keeps every student's progress. Milestones you remove stop counting, but their ticks aren't deleted."
              : "Added after the last stage on this track."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="stage-name">Stage name</Label>
            <Input id="stage-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="off" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="stage-focus">Working on</Label>
            <Textarea id="stage-focus" value={focus} onChange={(e) => setFocus(e.target.value)} className="min-h-14" />
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-[13px] font-semibold">Ready to move on when… (milestones)</legend>
            {rows.map((r, i) => (
              <div key={r.key} className="flex items-center gap-2">
                <Input
                  ref={i === rows.length - 1 ? lastRef : undefined}
                  aria-label={`Milestone ${i + 1}`}
                  value={r.text}
                  onChange={(e) => setRows((list) => list.map((x) => (x.key === r.key ? { ...x, text: e.target.value } : x)))}
                  placeholder="e.g. 20-ball rally from the baseline"
                  maxLength={200}
                  autoComplete="off"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove milestone ${i + 1}`}
                  onClick={() => setRows((list) => list.filter((x) => x.key !== r.key))}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 self-start"
              onClick={() => {
                setRows((list) => [...list, { key: createId(), text: "" }]);
                // Put the cursor in the new milestone once it's on screen.
                requestAnimationFrame(() => lastRef.current?.focus());
              }}
            >
              <Plus className="size-3.5" />
              Add milestone
            </Button>
          </fieldset>

          {stage && (stage.builtIn ? stage.edited : true) && (
            <div className="rounded-md border px-3 py-2.5 text-xs">
              {stage.builtIn ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-muted-foreground">Original: “{original?.name}”</span>
                  <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={remove}>
                    <RotateCcw className="size-3.5" />
                    Reset to original
                  </Button>
                </div>
              ) : inUse || !isLast ? (
                <p className="text-muted-foreground">
                  {inUse ? "A student has reached this stage, so it can't be deleted." : "Only the last stage on a track can be deleted."}
                </p>
              ) : (
                <Button type="button" variant="outline" size="sm" className="gap-1.5 text-rose-700" onClick={remove}>
                  <Trash2 className="size-3.5" />
                  Delete this stage
                </Button>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid}>
              {stage ? "Save stage" : "Add stage"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
