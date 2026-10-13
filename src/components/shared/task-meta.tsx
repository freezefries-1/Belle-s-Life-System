import { CalendarClock, Clock } from "lucide-react";

import { daysBetween, relativeDayPhrase } from "@/lib/date";
import { TASK_STATUS_LABEL } from "@/lib/tasks/task-model";
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

/**
 * Due date, phrased calmly. Today/tomorrow get a gentle amber; overdue a
 * soft rose — noticeable, never alarming.
 */
export function DueLabel({
  due,
  today,
  done = false,
  className,
}: {
  due: ISODate | null;
  today: ISODate;
  done?: boolean;
  className?: string;
}) {
  if (!due) return null;
  const diff = daysBetween(today, due);
  const phrase = relativeDayPhrase(due, today);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs whitespace-nowrap",
        done
          ? "text-muted-foreground"
          : diff < 0
            ? "font-semibold text-rose-700"
            : diff <= 1
              ? "font-semibold text-amber-700"
              : "text-muted-foreground",
        className,
      )}
    >
      <CalendarClock className="size-3" />
      {done ? `Due ${phrase}` : diff < 0 ? `Overdue · ${phrase}` : `Due ${phrase}`}
    </span>
  );
}

const STATUS_STYLES: Record<TaskStatus, { className: string; dot: string }> = {
  todo: { className: "bg-muted text-muted-foreground", dot: "bg-slate-400" },
  in_progress: { className: "bg-accent text-accent-foreground", dot: "bg-primary" },
  completed: { className: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  skipped: { className: "bg-slate-100 text-slate-500", dot: "bg-slate-300" },
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
      <span className={cn("size-1.5 rounded-full", s.dot)} />
      {TASK_STATUS_LABEL[status]}
    </span>
  );
}
