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
import { Textarea } from "@/components/ui/textarea";
import { CAPTURE_KINDS } from "@/data/capture-kinds";
import { useWorkspaceActions } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";
import type { Capture, CaptureKind } from "@/types";

export function CaptureEditDialog({
  capture,
  open,
  onOpenChange,
}: {
  capture: Capture;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const actions = useWorkspaceActions();
  const [title, setTitle] = React.useState(capture.title);
  const [note, setNote] = React.useState(capture.note);
  const [kind, setKind] = React.useState<CaptureKind>(capture.kind);
  const valid = title.trim().length > 0;

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!valid) return;
    actions.updateCapture(capture.id, { title, note, kind });
    toast("Entry updated", { description: title.trim() });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-4 max-w-lg sm:top-[12%]">
        <DialogHeader>
          <DialogTitle>Edit entry</DialogTitle>
          <DialogDescription>Tidy the wording or add a note. It stays in your inbox.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="capture-title">Title</Label>
            <Input
              id="capture-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-invalid={!valid}
              maxLength={500}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="capture-note" className="text-muted-foreground">
              Note
            </Label>
            <Textarea
              id="capture-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
              }}
              placeholder="Optional"
              className="min-h-16"
            />
          </div>
          <fieldset>
            <legend className="mb-2 text-[13px] font-semibold">Type</legend>
            <div className="flex flex-wrap gap-1.5">
              {CAPTURE_KINDS.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  aria-pressed={kind === k.id}
                  onClick={() => setKind(k.id)}
                  className={cn(
                    "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none",
                    kind === k.id
                      ? "border-primary/40 bg-accent text-accent-foreground"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  <k.icon className={cn("size-3.5", kind !== k.id && k.className)} />
                  {k.label}
                </button>
              ))}
            </div>
          </fieldset>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
