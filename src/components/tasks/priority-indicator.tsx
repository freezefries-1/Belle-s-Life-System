import { PRIORITY_LABEL } from "@/lib/tasks/task-model";
import { cn } from "@/lib/utils";
import type { TaskPriority } from "@/types";

/** Three small signal bars — quiet, readable at a glance, no alarm colours. */
export function PriorityIndicator({
  priority,
  showLabel = false,
  className,
}: {
  priority: TaskPriority | null;
  showLabel?: boolean;
  className?: string;
}) {
  const level = priority === "high" ? 3 : priority === "medium" ? 2 : priority === "low" ? 1 : 0;
  const label = priority ? `${PRIORITY_LABEL[priority]} priority` : "No priority";

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground", className)}
      title={label}
    >
      <span className="flex h-3 items-end gap-[2px]" role="img" aria-label={label}>
        {[1, 2, 3].map((bar) => (
          <span
            key={bar}
            className={cn(
              "w-[3px] rounded-[1px]",
              bar === 1 ? "h-1.5" : bar === 2 ? "h-2.5" : "h-3",
              bar <= level ? (level === 3 ? "bg-rose-500" : "bg-slate-600") : "bg-slate-200",
            )}
          />
        ))}
      </span>
      {showLabel && <span>{priority ? PRIORITY_LABEL[priority] : "None"}</span>}
    </span>
  );
}
