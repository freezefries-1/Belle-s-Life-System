"use client";

import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/lib/store/workspace-store";
import { hasAnyData } from "@/lib/workspace-data";

/** Shown only while the workspace is completely empty (e.g. first visit). */
export function GettingStarted() {
  const { workspace, actions } = useWorkspace();
  // Only for a truly empty workspace: loading sample data replaces everything.
  if (hasAnyData(workspace)) return null;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-dashed border-primary/30 bg-accent/40 p-5 sm:flex-row sm:items-center">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card text-primary shadow-xs">
        <Sparkles className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold">Welcome — your system is ready.</p>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Start by typing whatever is on your mind into the Brain Dump. Everything saves as you go.
        </p>
      </div>
      <Button
        variant="outline"
        className="shrink-0"
        onClick={() => {
          actions.loadSampleData();
          toast("Sample data loaded", { description: "Clear it any time from Preferences." });
        }}
      >
        Explore with sample data
      </Button>
    </div>
  );
}
