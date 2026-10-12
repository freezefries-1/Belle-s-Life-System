"use client";

import { CaptureForm } from "@/components/shared/capture-form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WorkspaceReady } from "@/lib/store/workspace-store";

export function QuickAddDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Quick capture</DialogTitle>
          <DialogDescription>Get it out of your head. You can sort it later in Brain Dump.</DialogDescription>
        </DialogHeader>
        <WorkspaceReady fallback={null}>
          <CaptureForm autoFocus size="lg" onCaptured={() => onOpenChange(false)} />
        </WorkspaceReady>
      </DialogContent>
    </Dialog>
  );
}
