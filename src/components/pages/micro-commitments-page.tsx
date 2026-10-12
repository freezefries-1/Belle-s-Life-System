"use client";

import { Plus, Sprout } from "lucide-react";

import { CommitmentWeek } from "@/components/shared/commitment-week";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { addDays } from "@/lib/date";
import { isCommitmentDone } from "@/lib/selectors";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";

export function MicroCommitmentsPage() {
  const { workspace, actions } = useWorkspace();
  const { today } = workspace;

  return (
    <>
      <PageHeader
        title="Micro-Commitments"
        description="Habits so small they’re hard to skip. Missing a day is normal — just pick it back up. Ticks here are a preview and reset on refresh."
        actions={
          <Button variant="outline" disabled title="Adding commitments arrives in a later phase" className="gap-1.5">
            <Plus className="size-4" />
            New commitment
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-4">
          {workspace.commitments.map((c) => {
            const done = isCommitmentDone(c, today);
            const last14 = Array.from({ length: 14 }, (_, i) => addDays(today, -i)).filter((d) =>
              c.completedDates.includes(d),
            ).length;
            const id = `mc-${c.id}`;
            return (
              <Card key={c.id} className={cn("p-5 transition-colors", done && "border-primary/30")}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex flex-1 items-start gap-3.5">
                    <Checkbox
                      id={id}
                      checked={done}
                      onCheckedChange={() => actions.toggleCommitment(c.id)}
                      className="mt-0.5 size-6 rounded-md"
                    />
                    <label htmlFor={id} className="min-w-0 cursor-pointer">
                      <span className="block text-[15px] font-semibold">{c.title}</span>
                      {c.description && <span className="mt-0.5 block text-[13px] text-muted-foreground">{c.description}</span>}
                      {c.cue && (
                        <span className="mt-2 inline-flex rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          Cue: {c.cue}
                        </span>
                      )}
                    </label>
                  </div>
                  <div className="flex flex-col gap-1.5 sm:items-end">
                    <CommitmentWeek commitment={c} today={today} days={14} showLabels />
                    <p className="text-xs text-muted-foreground tabular-nums">{last14} of the last 14 days</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="h-fit border-dashed bg-card/60 p-5">
          <p className="flex items-center gap-2 text-[15px] font-semibold">
            <Sprout className="size-4 text-primary" />
            Keep it tiny
          </p>
          <ul className="mt-3 flex flex-col gap-2.5 text-[13px] text-muted-foreground">
            <li>Make it small enough to do on your worst day.</li>
            <li>Attach it to a cue you already have — coffee, dinner, bedtime.</li>
            <li>Consistency beats intensity. Five pages is a win.</li>
            <li>Missed a day? No streak to protect. Tomorrow is a fresh square.</li>
          </ul>
        </Card>
      </div>
    </>
  );
}
