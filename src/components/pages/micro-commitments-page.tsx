"use client";

import * as React from "react";
import { Plus, Sprout } from "lucide-react";
import { toast } from "sonner";

import { CommitmentCard } from "@/components/commitments/commitment-card";
import { CommitmentEditorDialog } from "@/components/commitments/commitment-editor-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SUGGESTED_COMMITMENTS, getCommitmentProgress, isScheduledOn } from "@/lib/daily/commitments";
import { useWorkspace } from "@/lib/store/workspace-store";
import type { MicroCommitment } from "@/types";

export function MicroCommitmentsPage() {
  const { workspace, actions } = useWorkspace();
  const [creating, setCreating] = React.useState(false);
  const { commitments, commitmentCompletions, today } = workspace;

  const byCreated = (a: MicroCommitment, b: MicroCommitment) => a.createdAt.localeCompare(b.createdAt);
  const active = commitments.filter((c) => c.status === "active").sort(byCreated);
  const scheduled = active.filter((c) => isScheduledOn(c, today, commitmentCompletions));
  const notToday = active.filter((c) => !scheduled.includes(c));
  const paused = commitments.filter((c) => c.status === "paused").sort(byCreated);
  const archived = commitments.filter((c) => c.status === "archived").sort(byCreated);
  const progress = getCommitmentProgress(commitments, today, commitmentCompletions);
  const existingTitles = new Set(commitments.map((c) => c.title.toLowerCase()));
  const suggestions = SUGGESTED_COMMITMENTS.filter((s) => !existingTitles.has(s.title.toLowerCase()));

  return (
    <>
      <PageHeader
        title="Micro-Commitments"
        description="Small actions, repeated. Missing a day is normal — just pick it back up."
        actions={
          <Button onClick={() => setCreating(true)} className="gap-1.5">
            <Plus className="size-4" strokeWidth={2.5} />
            New commitment
          </Button>
        }
      />

      {commitments.length === 0 ? (
        <Card className="items-center px-6 py-12 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-accent text-primary">
            <Sprout className="size-5" />
          </span>
          <p className="mt-3 text-[15px] font-semibold">Start with something tiny</p>
          <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">
            Pick one small thing you’d like to do most days. You can add your own or start from an idea below.
          </p>
          <div className="mt-5 flex max-w-lg flex-wrap justify-center gap-2">
            {suggestions.map((s) => (
              <Button
                key={s.title}
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  actions.createCommitment(s);
                  toast("Commitment added", { description: s.title });
                }}
              >
                <Plus className="size-3.5" />
                {s.title}
              </Button>
            ))}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex min-w-0 flex-col gap-6">
            <section aria-labelledby="mc-today" className="flex flex-col gap-3">
              <h3 id="mc-today" className="text-base font-semibold">
                Today
              </h3>
              {scheduled.length === 0 ? (
                <p className="rounded-xl border border-dashed bg-card/60 px-4 py-6 text-center text-[13px] text-muted-foreground">
                  Nothing scheduled today. Enjoy the space.
                </p>
              ) : (
                scheduled.map((c) => <CommitmentCard key={c.id} commitment={c} />)
              )}
            </section>

            {notToday.length > 0 && (
              <section aria-labelledby="mc-later" className="flex flex-col gap-3">
                <h3 id="mc-later" className="text-base font-semibold">
                  Not scheduled today
                </h3>
                {notToday.map((c) => (
                  <CommitmentCard key={c.id} commitment={c} />
                ))}
              </section>
            )}

            {[
              { id: "paused", label: "Paused", list: paused },
              { id: "archived", label: "Archived", list: archived },
            ].map(
              (group) =>
                group.list.length > 0 && (
                  <details key={group.id} className="group">
                    <summary className="cursor-pointer list-none text-xs font-semibold text-muted-foreground hover:text-foreground">
                      <span className="group-open:hidden">Show</span>
                      <span className="hidden group-open:inline">Hide</span> {group.label.toLowerCase()} ({group.list.length})
                    </summary>
                    <div className="mt-3 flex flex-col gap-3">
                      {group.list.map((c) => (
                        <CommitmentCard key={c.id} commitment={c} />
                      ))}
                    </div>
                  </details>
                ),
            )}
          </div>

          <aside className="flex flex-col gap-4" aria-label="Today’s summary">
            <Card className="p-5">
              <h3 className="text-[15px] font-semibold">Today</h3>
              {progress.percent === null ? (
                <p className="mt-2 text-[13px] text-muted-foreground">Nothing scheduled today.</p>
              ) : (
                <>
                  <p className="mt-2 text-2xl font-bold tabular-nums">
                    {progress.done}
                    <span className="text-base font-semibold text-muted-foreground"> / {progress.scheduled}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">completed · {progress.percent}%</p>
                  <Progress value={progress.percent} className="mt-3" aria-label="Commitments completed today" />
                </>
              )}
            </Card>
            <Card className="border-dashed bg-card/60 p-5">
              <p className="flex items-center gap-2 text-[15px] font-semibold">
                <Sprout className="size-4 text-primary" />
                Keep it tiny
              </p>
              <ul className="mt-3 flex flex-col gap-2.5 text-[13px] text-muted-foreground">
                <li>Small enough to do on your busiest day.</li>
                <li>Streaks only count scheduled days — rest days never break them.</li>
                <li>Pause any time. Your history stays.</li>
              </ul>
            </Card>
          </aside>
        </div>
      )}

      {creating && <CommitmentEditorDialog open={creating} onOpenChange={setCreating} />}
    </>
  );
}
