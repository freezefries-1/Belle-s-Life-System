import { SPRINT_BY_ID, SPRINT_STYLES } from "@/data/sprints";
import { cn } from "@/lib/utils";
import type { SprintId } from "@/types";

export function SprintDot({ sprintId, className }: { sprintId: SprintId | null; className?: string }) {
  return (
    <span
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        sprintId ? SPRINT_STYLES[sprintId].dot : "border border-dashed border-slate-400",
        className,
      )}
      aria-hidden
    />
  );
}

/** Compact sprint label: coloured dot + "S3 Admin & Life". */
export function SprintBadge({
  sprintId,
  variant = "default",
  className,
}: {
  sprintId: SprintId | null;
  variant?: "default" | "full" | "ink";
  className?: string;
}) {
  if (!sprintId) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs whitespace-nowrap text-subtle-foreground", className)}>
        <span className="inline-block size-2 shrink-0 rounded-full border border-dashed border-slate-300" aria-hidden />
        No sprint
      </span>
    );
  }
  const sprint = SPRINT_BY_ID[sprintId];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap",
        variant === "ink" ? "text-ink-muted" : "text-muted-foreground",
        className,
      )}
    >
      <SprintDot sprintId={sprintId} />
      {variant === "full" || variant === "ink" ? `Sprint ${sprint.number}: ${sprint.name}` : sprint.name}
    </span>
  );
}
