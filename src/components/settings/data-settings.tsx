"use client";

import * as React from "react";
import { Download, HardDrive, RotateCcw, Sparkles } from "lucide-react";
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
import { createEnvelope } from "@/lib/storage/schema";
import { useWorkspace } from "@/lib/store/workspace-store";

type Pending = "sample" | "clear" | null;

/** Where data lives, a backup download, and the two destructive resets (both confirmed). */
export function DataSettings() {
  const { workspace, actions, storage } = useWorkspace();
  const [pending, setPending] = React.useState<Pending>(null);
  const hasData = workspace.tasks.length > 0 || workspace.captures.length > 0;

  function downloadBackup() {
    const envelope = createEnvelope({
      tasks: workspace.tasks,
      captures: workspace.captures,
      sessions: workspace.sessions,
    });
    const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `belles-life-system-backup-${workspace.today}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Backup downloaded");
  }

  function confirm() {
    if (pending === "sample") {
      actions.loadSampleData();
      toast("Sample data loaded");
    } else if (pending === "clear") {
      actions.clearAllData();
      toast("All tasks and Brain Dump entries cleared");
    }
    setPending(null);
  }

  return (
    <>
      <div className="flex items-start gap-3 rounded-lg bg-muted/60 px-3.5 py-3">
        <HardDrive className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="text-[13px]">
          <p className="font-semibold">
            {storage.status === "unavailable" ? "Storage unavailable" : "Saved in this browser"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {workspace.tasks.length} tasks · {workspace.captures.length} Brain Dump entries.{" "}
            {storage.status === "unavailable"
              ? "This browser is blocking storage, so changes won’t survive closing the tab."
              : "Data stays on this device and browser until cloud sync arrives."}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <DataAction
          title="Download a backup"
          body="A JSON copy of your tasks and Brain Dump."
          action={
            <Button variant="outline" size="sm" className="gap-1.5" onClick={downloadBackup} disabled={!hasData}>
              <Download className="size-3.5" />
              Download
            </Button>
          }
        />
        <DataAction
          title="Explore with sample data"
          body={hasData ? "Replaces your current tasks and Brain Dump with a sample week." : "Fill the app with a realistic sample week."}
          action={
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => (hasData ? setPending("sample") : confirmSampleNow())}
            >
              <Sparkles className="size-3.5" />
              Load sample
            </Button>
          }
        />
        <DataAction
          title="Clear all data"
          body="Delete every task and Brain Dump entry in this browser."
          action={
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              onClick={() => setPending("clear")}
              disabled={!hasData}
            >
              <RotateCcw className="size-3.5" />
              Clear
            </Button>
          }
        />
      </div>

      <Dialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{pending === "clear" ? "Clear all data?" : "Replace with sample data?"}</DialogTitle>
            <DialogDescription>
              {pending === "clear"
                ? `This permanently deletes ${workspace.tasks.length} tasks and ${workspace.captures.length} Brain Dump entries from this browser. Download a backup first if you might want them.`
                : `Your ${workspace.tasks.length} tasks and ${workspace.captures.length} Brain Dump entries will be replaced. Download a backup first if you want to keep them.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button
              onClick={confirm}
              className={pending === "clear" ? "bg-rose-600 hover:bg-rose-700" : undefined}
            >
              {pending === "clear" ? "Delete everything" : "Replace with sample"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  function confirmSampleNow() {
    actions.loadSampleData();
    toast("Sample data loaded");
  }
}

function DataAction({ title, body, action }: { title: string; body: string; action: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border px-3.5 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{body}</p>
      </div>
      {action}
    </div>
  );
}
