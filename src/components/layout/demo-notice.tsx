"use client";

import { HardDrive, TriangleAlert } from "lucide-react";

import { useWorkspaceOptional } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";

/** Says plainly where data lives — this browser only, until cloud sync arrives. */
export function DemoNotice({ className }: { className?: string }) {
  const ctx = useWorkspaceOptional();
  const unavailable = ctx?.storage.status === "unavailable";
  const Icon = unavailable ? TriangleAlert : HardDrive;

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border border-ink-border/70 bg-ink-2/50 px-3 py-2.5 text-[11px] leading-snug text-ink-muted",
        className,
      )}
    >
      <Icon className={cn("mt-px size-3.5 shrink-0", unavailable && "text-amber-400")} />
      {unavailable ? (
        <span>
          <span className="font-semibold text-ink-foreground">Not saving.</span> This browser is blocking storage, so
          changes last until you close the tab.
        </span>
      ) : (
        <span>
          <span className="font-semibold text-ink-foreground">Saved in this browser.</span> Tasks and Brain Dump stay on
          this device. Other sections show preview data.
        </span>
      )}
    </div>
  );
}
