"use client";

import * as React from "react";
import Link from "next/link";
import { Check } from "lucide-react";

import { CaptureForm } from "@/components/brain-dump/capture-form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WorkspaceReady } from "@/lib/store/workspace-store";
import type { Capture } from "@/types";

/**
 * Global capture. Stays open after each entry so several thoughts can be
 * dumped in a row; Escape closes it.
 */
export function QuickAddDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [captured, setCaptured] = React.useState<Capture[]>([]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setCaptured([]);
        onOpenChange(next);
      }}
    >
      <DialogContent className="top-4 max-w-xl sm:top-[14%]">
        <DialogHeader>
          <DialogTitle>Quick capture</DialogTitle>
          <DialogDescription>
            Get it out of your head. Press Enter after each one — sort them later in Brain Dump.
          </DialogDescription>
        </DialogHeader>
        <WorkspaceReady fallback={null}>
          <CaptureForm autoFocus size="lg" onCaptured={(c) => setCaptured((list) => [c, ...list])} />
        </WorkspaceReady>
        {captured.length > 0 && (
          <div className="flex flex-col gap-2 border-t pt-3">
            <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Captured just now · {captured.length}
            </p>
            <ul className="flex max-h-40 flex-col gap-1.5 overflow-y-auto">
              {captured.map((c) => (
                <li key={c.id} className="flex items-center gap-2 text-[13px]">
                  <Check className="size-3.5 shrink-0 text-emerald-600" />
                  <span className="truncate">{c.title}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Esc to close</span>
              <Link
                href="/brain-dump"
                onClick={() => onOpenChange(false)}
                className="font-semibold text-primary hover:text-primary-hover"
              >
                Open Brain Dump
              </Link>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
