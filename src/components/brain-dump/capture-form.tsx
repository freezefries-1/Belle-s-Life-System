"use client";

import * as React from "react";
import { CornerDownLeft, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CAPTURE_KINDS } from "@/data/capture-kinds";
import { useWorkspaceActions } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";
import type { Capture, CaptureKind } from "@/types";

/**
 * One-line capture. Type, press Enter, keep going — the input stays
 * focused so several thoughts can be dumped in a row.
 * New entries go to the Brain Dump inbox with no date, sprint or project.
 */
export function CaptureForm({
  autoFocus,
  size = "default",
  showKinds = true,
  onCaptured,
  className,
}: {
  autoFocus?: boolean;
  size?: "default" | "lg";
  showKinds?: boolean;
  onCaptured?: (capture: Capture) => void;
  className?: string;
}) {
  const actions = useWorkspaceActions();
  const [text, setText] = React.useState("");
  const [kind, setKind] = React.useState<CaptureKind>("task");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const inputId = React.useId();
  const canSubmit = text.trim().length > 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const capture = actions.addCapture({ title: text, kind });
    if (!capture) return;
    setText("");
    inputRef.current?.focus();
    toast("Captured to Brain Dump", { description: capture.title });
    onCaptured?.(capture);
  }

  return (
    <form onSubmit={submit} className={cn("flex flex-col gap-2.5", className)}>
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border border-input bg-card pr-1.5 pl-3.5 shadow-xs transition-[border-color,box-shadow] focus-within:border-primary/60 focus-within:ring-[3px] focus-within:ring-ring/15",
          size === "lg" ? "h-12" : "h-11",
        )}
      >
        <label htmlFor={inputId} className="sr-only">
          Capture a thought
        </label>
        <Plus className="size-4 shrink-0 text-subtle-foreground" />
        <input
          ref={inputRef}
          id={inputId}
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus={autoFocus}
          autoComplete="off"
          enterKeyHint="done"
          maxLength={500}
          placeholder="What’s on your mind?"
          className={cn(
            "h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-subtle-foreground",
            size === "lg" ? "text-[15px]" : "text-sm",
          )}
        />
        <Button type="submit" size="sm" disabled={!canSubmit} className="gap-1.5">
          Add
          <CornerDownLeft className="hidden size-3.5 opacity-70 sm:block" />
        </Button>
      </div>

      {showKinds && (
        <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Capture type">
          {CAPTURE_KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              role="radio"
              aria-checked={kind === k.id}
              onClick={() => setKind(k.id)}
              className={cn(
                "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border px-2 text-xs font-semibold transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none",
                kind === k.id
                  ? "border-primary/30 bg-accent text-accent-foreground"
                  : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <k.icon className={cn("size-3.5", kind === k.id ? "text-accent-foreground" : k.className)} />
              {k.label}
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
