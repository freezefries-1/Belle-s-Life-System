import { CalendarClock, Clock, History } from "lucide-react";

import { daysBetween, relativeDayPhrase } from "@/lib/date";
import { cn, formatMinutes } from "@/lib/utils";
import type { ISODate, TaskStatus } from "@/types";

export function EstimateLabel({ minutes, className }: { minutes: number | null; className?: string }) {
  if (minutes == null) return null;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs whitespace-nowrap text-muted-foreground", className)}>
      <Clock className="size-3" />
      {formatMinutes(minutes)}
    </span>
  );
}

/** Due date, phrased calmly. Soon-ish dates get a gentle amber, never red. */
export function DueLabel({ due, today, className }: { due: ISODate | null; today: ISODate; className?: string }) {
  if (!due) return null;
  const diff = daysBetween(today, due);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs whitespace-nowrap",
        diff <= 1 ? "font-semibold text-amber-700" : "text-muted-foreground",
        className,
      )}
    >
      <CalendarClock className="size-3" />
      {diff < 0 ? `Was due ${relativeDayPhrase(due, today)}` : `Due ${relativeDayPhrase(due, today)}`}
    </span>
  );
}

export function CarriedOverLabel({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs whitespace-nowrap text-slate-500", className)}>
      <History className="size-3" />
      Carried over
    </span>
  );
}

const STATUS_STYLES: Record<TaskStatus, { label: string; className: string }> = {
  todo: { label: "To do", className: "bg-muted text-muted-foreground" },
  in_progress: { label: "In progress", className: "bg-accent text-accent-foreground" },
  done: { label: "Done", className: "bg-emerald-50 text-emerald-700" },
};

export function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        s.className,
        className,
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          status === "todo" && "bg-slate-400",
          status === "in_progress" && "bg-primary",
          status === "done" && "bg-emerald-500",
        )}
      />
      {s.label}
    </span>
  );
}
