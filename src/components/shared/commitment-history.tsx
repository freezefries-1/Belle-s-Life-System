import { formatShortDate, formatWeekday } from "@/lib/date";
import { getRecentHistory } from "@/lib/daily/commitments";
import { cn } from "@/lib/utils";
import type { CommitmentCompletion, ISODate, MicroCommitment } from "@/types";

/**
 * Recent rhythm as small squares: filled = done, outlined = scheduled and
 * open, faint = not scheduled. Weekly commitments show one square per week.
 */
export function CommitmentHistory({
  commitment,
  completions,
  today,
  count = 7,
  showLabels = false,
  className,
}: {
  commitment: MicroCommitment;
  completions: CommitmentCompletion[];
  today: ISODate;
  count?: number;
  showLabels?: boolean;
  className?: string;
}) {
  const { cells, scheduled, done } = getRecentHistory(commitment, today, completions, count);
  const weekly = commitment.frequency === "weekly";
  const label = `${commitment.title}: done ${done} of the last ${scheduled} scheduled ${weekly ? "weeks" : "days"}`;

  return (
    <div className={cn("flex items-end gap-1", className)} role="img" aria-label={label}>
      {cells.map((cell) => (
        <div key={cell.key} className="flex flex-col items-center gap-1">
          <span
            title={weekly ? `Week of ${formatShortDate(cell.key)}` : formatShortDate(cell.key)}
            className={cn(
              "size-2.5 rounded-[3px] transition-colors",
              cell.state === "done" && "bg-primary",
              cell.state === "open" && "bg-slate-200",
              cell.state === "today" && "bg-card ring-1 ring-primary/50",
              cell.state === "off" && "bg-slate-100",
            )}
          />
          {showLabels && (
            <span className={cn("text-[10px] text-muted-foreground", cell.key === today && "font-bold text-foreground")}>
              {weekly ? formatShortDate(cell.key).split(" ")[0] : formatWeekday(cell.key).slice(0, 1)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
