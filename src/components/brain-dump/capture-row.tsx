"use client";

import * as React from "react";
import { Archive, ArrowRight, FolderInput, Inbox, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useTaskEditor } from "@/components/tasks/task-editor-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CAPTURE_KIND_BY_ID } from "@/data/capture-kinds";
import { formatClockTime, localDateOf, relativeDayLabel } from "@/lib/date";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";
import type { Capture } from "@/types";

import { CaptureEditDialog } from "./capture-edit-dialog";
import { FileToProjectDialog } from "./file-to-project-dialog";

export function CaptureRow({ capture }: { capture: Capture }) {
  const { workspace, actions } = useWorkspace();
  const editor = useTaskEditor();
  const [editing, setEditing] = React.useState(false);
  const [filing, setFiling] = React.useState(false);
  const kept = capture.status === "kept";
  const kind = CAPTURE_KIND_BY_ID[capture.kind];
  const day = relativeDayLabel(localDateOf(capture.createdAt), workspace.today);

  function remove() {
    const removed = actions.deleteCapture(capture.id);
    if (!removed) return;
    toast("Entry deleted", {
      description: removed.title,
      action: { label: "Undo", onClick: () => actions.restoreCapture(removed) },
    });
  }

  function setKept(next: boolean) {
    actions.setCaptureKept(capture.id, next);
    // The row moves between the inbox and Kept notes; keep keyboard focus on it.
    const label = `Actions for “${capture.title}”`;
    window.setTimeout(() => document.querySelector<HTMLElement>(`[aria-label="${CSS.escape(label)}"]`)?.focus(), 0);
    toast(next ? "Kept as a note" : "Moved back to the inbox", {
      description: capture.title,
      action: { label: "Undo", onClick: () => actions.setCaptureKept(capture.id, !next) },
    });
  }

  return (
    <li className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40 sm:px-5">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted" title={kind.label}>
        <kind.icon className={cn("size-4", kind.className)} aria-label={kind.label} />
      </span>

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="block max-w-full cursor-pointer rounded text-left text-[13.5px] font-medium hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
        >
          {capture.title}
        </button>
        {capture.note && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{capture.note}</p>}
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className={cn("rounded px-1.5 py-px text-[11px] font-semibold", kept ? "bg-muted text-muted-foreground" : "bg-accent text-accent-foreground")}>
            {kept ? "Kept note" : "Inbox"}
          </span>
          <span>
            {kind.label} · {day} at {formatClockTime(capture.createdAt)}
          </span>
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="outline"
          size="xs"
          className="hidden gap-1 sm:inline-flex"
          onClick={() => editor.openConvert(capture.id)}
        >
          Convert to task
          <ArrowRight className="size-3.5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-xs" aria-label={`Actions for “${capture.title}”`}>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onSelect={() => setEditing(true)}>
              <Pencil />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => editor.openConvert(capture.id)}>
              <ArrowRight />
              Convert to task
            </DropdownMenuItem>
            {kept ? (
              <DropdownMenuItem onSelect={() => setKept(false)}>
                <Inbox />
                Back to inbox
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => setKept(true)}>
                <Archive />
                Keep as note
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={() => setFiling(true)}>
              <FolderInput />
              Add to project notes…
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={remove} className="text-rose-700 focus:text-rose-800">
              <Trash2 className="text-rose-500" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {editing && <CaptureEditDialog capture={capture} open={editing} onOpenChange={setEditing} />}
      {filing && <FileToProjectDialog capture={capture} open={filing} onOpenChange={setFiling} />}
    </li>
  );
}
