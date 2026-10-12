"use client";

import { toast } from "sonner";

import { Checkbox } from "@/components/ui/checkbox";
import { isDoneOn } from "@/lib/daily/commitments";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn, formatMinutes } from "@/lib/utils";
import type { ISODate, MicroCommitment } from "@/types";

/** One tick-box row: title, optional target time, done state for a given day. */
export function CommitmentCheck({
  commitment,
  date,
  className,
  trailing,
}: {
  commitment: MicroCommitment;
  date: ISODate;
  className?: string;
  trailing?: React.ReactNode;
}) {
  const { workspace, actions } = useWorkspace();
  const done = isDoneOn(commitment.id, date, workspace.commitmentCompletions);
  const id = `mc-${commitment.id}-${date}`;
  const future = date > workspace.today;

  return (
    <div className={cn("flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60", className)}>
      <Checkbox
        id={id}
        checked={done}
        disabled={future}
        onCheckedChange={() => {
          const nowDone = actions.toggleCommitmentDone(commitment.id, date);
          if (nowDone) toast("One small step completed.", { description: commitment.title });
        }}
        className="mt-[3px]"
      />
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <span
          className={cn(
            "block text-[13.5px] leading-snug font-medium",
            done && "text-muted-foreground line-through decoration-slate-300",
          )}
        >
          {commitment.title}
        </span>
        <span className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
          {commitment.targetMinutes != null && <span>{formatMinutes(commitment.targetMinutes)}</span>}
          {commitment.frequency === "weekly" && <span>This week</span>}
        </span>
      </label>
      {trailing}
    </div>
  );
}
