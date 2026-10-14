"use client";

import * as React from "react";
import { Check, Loader2, NotebookPen } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspaceActions } from "@/lib/store/workspace-store";
import type { Project } from "@/types";

/** Plain-text notes that save as you type (line breaks kept; simple "- " lists read fine). */
export function ProjectNotes({ project }: { project: Project }) {
  const actions = useWorkspaceActions();
  const [value, setValue] = React.useState(project.notes);
  const [status, setStatus] = React.useState<"idle" | "saving" | "saved">("idle");
  // Notes changed elsewhere (another device, or a Brain Dump entry added to them):
  // show the new text, unless you're in the middle of typing.
  const [seen, setSeen] = React.useState(project.notes);
  if (project.notes !== seen) {
    setSeen(project.notes);
    if (status !== "saving") setValue(project.notes);
  }
  const pending = React.useRef<string | null>(null);
  const timer = React.useRef<number | null>(null);

  const flush = React.useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    if (pending.current !== null) {
      actions.updateProject(project.id, { notes: pending.current });
      pending.current = null;
      setStatus("saved");
    }
  }, [actions, project.id]);

  React.useEffect(() => flush, [flush]);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold">
          <NotebookPen className="size-4 text-muted-foreground" />
          Notes
        </h3>
        <p className="flex h-4 items-center gap-1 text-[11px] text-muted-foreground" aria-live="polite">
          {status === "saving" && (
            <>
              <Loader2 className="size-3 animate-spin" /> Saving…
            </>
          )}
          {status === "saved" && (
            <>
              <Check className="size-3 text-emerald-600" /> Saved
            </>
          )}
        </p>
      </div>
      <Textarea
        aria-label="Project notes"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          pending.current = e.target.value;
          setStatus("saving");
          if (timer.current) window.clearTimeout(timer.current);
          timer.current = window.setTimeout(flush, 600);
        }}
        onBlur={flush}
        placeholder="Links, decisions, ideas… Saves as you type."
        className="mt-3 min-h-32 font-[inherit]"
      />
    </Card>
  );
}
