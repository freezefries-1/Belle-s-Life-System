"use client";

import { ProgressRing } from "@/components/shared/progress-ring";
import { formatLongDate } from "@/lib/date";
import { getTodayTasks } from "@/lib/selectors";
import { useWorkspace } from "@/lib/store/workspace-store";
import { percent } from "@/lib/utils";

export function WelcomeHeader() {
  const { workspace } = useWorkspace();
  const tasks = getTodayTasks(workspace);
  const done = tasks.filter((t) => t.status === "done").length;
  const pct = percent(done, tasks.length);

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold tracking-wide text-primary uppercase">{formatLongDate(workspace.today)}</p>
        <h2 className="mt-1.5 text-[28px] leading-tight font-bold tracking-tight lg:text-[32px]">Make today count.</h2>
        <p className="mt-1 text-[14px] text-muted-foreground">One priority. Small improvements. Real progress.</p>
      </div>

      <div className="flex items-center gap-3 self-start rounded-xl border bg-card py-2.5 pr-4 pl-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:self-auto">
        <ProgressRing value={pct} size={40} stroke={4} label={`${done} of ${tasks.length} of today’s tasks done`}>
          <span className="text-[10px] font-bold tabular-nums">{pct}%</span>
        </ProgressRing>
        <div className="leading-tight">
          <p className="text-[13px] font-semibold tabular-nums">
            {done} of {tasks.length} done
          </p>
          <p className="text-xs text-muted-foreground">Today’s plan</p>
        </div>
      </div>
    </div>
  );
}
