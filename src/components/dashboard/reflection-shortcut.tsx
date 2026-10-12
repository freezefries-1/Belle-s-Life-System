"use client";

import Link from "next/link";
import { ArrowRight, Check, PenLine } from "lucide-react";

import { getLogFor, hasNotes, hasReflection } from "@/lib/daily/day";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";

/** A quiet nudge to the Kaizen Log. Always optional. */
export function ReflectionShortcut({ className }: { className?: string }) {
  const { workspace } = useWorkspace();
  const log = getLogFor(workspace, workspace.today);
  const written = hasReflection(log) || hasNotes(log);

  return (
    <Link
      href="/kaizen-log"
      className={cn(
        "group flex items-center gap-3 rounded-xl border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-slate-300 focus-visible:ring-[3px] focus-visible:ring-ring/30 focus-visible:outline-none",
        className,
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
        {written ? <Check className="size-4" /> : <PenLine className="size-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold">{written ? "Today’s reflection saved" : "Reflect on today"}</span>
        <span className="block text-xs text-muted-foreground">
          {written ? "Add more any time." : "What went well? What could be better?"}
        </span>
      </span>
      <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
