"use client";

import * as React from "react";
import { Cloud, Download, HardDrive, RotateCcw, Sparkles } from "lucide-react";
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
import { useAccount } from "@/lib/auth/account";
import { hasAnyData } from "@/lib/workspace-data";
import { createEnvelope } from "@/lib/storage/schema";

import { BackupRestore } from "./backup-restore";
import { LocalDataMigration } from "./local-data-migration";
import { useWorkspace } from "@/lib/store/workspace-store";

type Pending = "sample" | "clear" | null;

/** Where data lives, a backup download, and the two destructive resets (both confirmed). */
export function DataSettings() {
  const { workspace, actions, storage } = useWorkspace();
  const [pending, setPending] = React.useState<Pending>(null);
  const cloud = useAccount();
  const [typed, setTyped] = React.useState("");
  const hasData = hasAnyData(workspace);

  function downloadBackup() {
    const {
      tasks,
      captures,
      sessions,
      highlights,
      commitments,
      commitmentCompletions,
      kaizenLogs,
      projects,
      milestones,
      recurrences,
      weeklyReviews,
      weeklyPriorities,
    } = workspace;
    const envelope = createEnvelope({
      tasks,
      captures,
      sessions,
      highlights,
      commitments,
      commitmentCompletions,
      kaizenLogs,
      projects,
      milestones,
      recurrences,
      weeklyReviews,
      weeklyPriorities,
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
      // Only reachable in browser-only mode, after confirming.
      actions.loadSampleData({ replace: !cloud });
      toast("Sample data loaded");
    } else if (pending === "clear") {
      actions.clearAllData();
      toast(cloud ? "All data in your account is being deleted" : "All data in this browser was cleared");
    }
    setPending(null);
    setTyped("");
  }

  return (
    <>
      <div className="flex items-start gap-3 rounded-lg bg-muted/60 px-3.5 py-3">
        {cloud ? <Cloud className="mt-0.5 size-4 shrink-0 text-primary" /> : <HardDrive className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
        <div className="text-[13px]">
          <p className="font-semibold">
            {cloud ? `Synced to ${cloud.account.email}` : storage.status === "unavailable" ? "Storage unavailable" : "Saved in this browser"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {workspace.tasks.length} tasks · {workspace.captures.length} Brain Dump entries ·{" "}
            {workspace.commitments.length} commitments · {workspace.projects.length} projects ·{" "}
            {workspace.recurrences.length} recurring · {workspace.kaizenLogs.length} log days.{" "}
            {cloud
              ? "Saved securely in your account and available on every device you sign in to."
              : storage.status === "unavailable"
                ? "This browser is blocking storage, so changes won’t survive closing the tab."
                : "Data stays on this device and browser."}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <DataAction
          title="Download a backup"
          body="A JSON file with everything — tasks, Brain Dump, focus sessions and time, highlights, commitments and their history, Kaizen Logs, projects, milestones, recurring tasks and weekly reviews — with every id and link kept. Keep a recent copy somewhere safe."
          action={
            <Button variant="outline" size="sm" className="gap-1.5" onClick={downloadBackup} disabled={!hasData}>
              <Download className="size-3.5" />
              Download
            </Button>
          }
        />
        {cloud && <BackupRestore />}
        {cloud && <LocalDataMigration />}
        {(!cloud || !hasData) && (
        <DataAction
          title="Explore with sample data"
          body={hasData ? "Replaces everything you’ve saved with a sample week." : "Fill the app with a realistic sample week."}
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
        )}
        <DataAction
          title={cloud ? "Delete all data in your account" : "Clear all data"}
          body={cloud ? "Permanently deletes everything in your account, on every device." : "Delete everything saved in this browser."}
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
            <DialogTitle>{pending === "clear" ? (cloud ? "Delete all data in your account?" : "Clear all data?") : "Replace with sample data?"}</DialogTitle>
            <DialogDescription>
              {pending === "clear"
                ? cloud
                  ? "This permanently deletes every record in your account, on every device. It can’t be undone. Download a backup first. Type DELETE to confirm."
                  : "This permanently deletes everything saved in this browser — tasks, Brain Dump, focus sessions, highlights, commitments, Kaizen Logs, projects, milestones, recurring tasks and weekly reviews. Download a backup first if you might want them."
                : "Everything saved in this browser — tasks, Brain Dump, focus sessions, highlights, commitments, Kaizen Logs, projects, milestones, recurring tasks and weekly reviews — will be replaced. Download a backup first if you want to keep it."}
            </DialogDescription>
          </DialogHeader>
          {pending === "clear" && cloud && (
            <Input aria-label="Type DELETE to confirm" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="DELETE" />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button
              onClick={confirm}
              disabled={pending === "clear" && !!cloud && typed !== "DELETE"}
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
