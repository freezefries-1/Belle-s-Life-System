import { Info } from "lucide-react";

import { cn } from "@/lib/utils";

/** Makes it clear Phase 1 controls are a preview and nothing is saved. */
export function DemoNotice({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border border-ink-border/70 bg-ink-2/50 px-3 py-2.5 text-[11px] leading-snug text-ink-muted",
        className,
      )}
    >
      <Info className="mt-px size-3.5 shrink-0" />
      {compact ? (
        <span>Preview data</span>
      ) : (
        <span>
          <span className="font-semibold text-ink-foreground">Preview mode.</span> Sample data — changes
          reset when you refresh.
        </span>
      )}
    </div>
  );
}
