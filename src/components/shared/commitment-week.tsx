import { addDays, formatWeekday } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { ISODate, MicroCommitment } from "@/types";

/** Last N days as small dots — a gentle rhythm indicator, not a streak to protect. */
export function CommitmentWeek({
  commitment,
  today,
  days = 7,
  showLabels = false,
  className,
}: {
  commitment: MicroCommitment;
  today: ISODate;
  days?: number;
  showLabels?: boolean;
  className?: string;
}) {
  const dates = Array.from({ length: days }, (_, i) => addDays(today, i - days + 1));
  const doneCount = dates.filter((d) => commitment.completedDates.includes(d)).length;

  return (
    <div
      className={cn("flex items-end gap-1", className)}
      role="img"
      aria-label={`${commitment.title}: done ${doneCount} of the last ${days} days`}
    >
      {dates.map((date) => {
        const done = commitment.completedDates.includes(date);
        const isToday = date === today;
        return (
          <div key={date} className="flex flex-col items-center gap-1">
            <span
              className={cn(
                "size-2.5 rounded-[3px] transition-colors",
                done ? "bg-primary" : "bg-slate-200",
                isToday && !done && "ring-1 ring-primary/50 ring-offset-1",
              )}
            />
            {showLabels && (
              <span className={cn("text-[10px] text-muted-foreground", isToday && "font-bold text-foreground")}>
                {formatWeekday(date).slice(0, 1)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
