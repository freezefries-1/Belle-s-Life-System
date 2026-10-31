"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Plus } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StageEditorDialog } from "@/components/students/stage-editor-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { type StageDef } from "@/lib/students/ladder";
import { currentStages } from "@/lib/students/student-model";
import { useLadder } from "@/lib/students/use-ladder";
import { useWorkspace } from "@/lib/store/workspace-store";
import type { TrackId } from "@/types";

type Editing = { track: TrackId; stage?: StageDef };

/** Students → Coaching ladder: your wording for every stage and its milestones. */
export function LadderPage() {
  const { workspace } = useWorkspace();
  const ladder = useLadder();
  const [editing, setEditing] = React.useState<Editing | null>(null);

  // How many active students are currently at each stage.
  const atStage = new Map<string, number>();
  for (const s of workspace.students.filter((x) => x.status === "active")) {
    const current = currentStages(ladder, workspace.studentStages, s.id);
    for (const t of ladder.tracks) {
      const id = current[t.id]?.stage;
      if (id) atStage.set(`${t.id}:${id}`, (atStage.get(`${t.id}:${id}`) ?? 0) + 1);
    }
  }

  return (
    <>
      <Link href="/students" className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" />
        All students
      </Link>
      <PageHeader
        title="Coaching ladder"
        description="The stages on each track and the milestones for moving on. Reword anything to match how you coach; students keep their progress."
      />
      <div className="flex flex-col gap-6">
        {ladder.tracks.map((t) => (
          <section key={t.id} aria-labelledby={`ladder-${t.id}`} className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h3 id={`ladder-${t.id}`} className="text-base font-semibold">
                {t.name}
              </h3>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditing({ track: t.id })}>
                <Plus className="size-3.5" />
                Add stage
              </Button>
            </div>
            <Card className="overflow-hidden">
              <ol className="divide-y" aria-label={`${t.name} stages`}>
                {t.stages.map((s) => {
                  const here = atStage.get(`${t.id}:${s.id}`) ?? 0;
                  return (
                    <li key={s.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                      <span className="w-9 shrink-0 pt-px text-[13px] font-bold text-muted-foreground tabular-nums">{s.id}</span>
                      <div className="min-w-0 flex-1 text-[13px]">
                        <p className="flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold">{s.name}</span>
                          {!s.builtIn && <Badge variant="secondary">Added by you</Badge>}
                          {s.builtIn && s.edited && <Badge variant="secondary">Edited</Badge>}
                          {here > 0 && (
                            <span className="text-xs text-muted-foreground">
                              · {here} {here === 1 ? "student" : "students"} here
                            </span>
                          )}
                        </p>
                        {s.focus && <p className="mt-0.5 text-muted-foreground">{s.focus}</p>}
                        {s.checks.length > 0 && (
                          <ul className="mt-1.5 list-disc pl-4 text-xs" aria-label={`${s.id} milestones`}>
                            {s.checks.map((c) => (
                              <li key={c.id}>{c.text}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <Button variant="ghost" size="icon-xs" aria-label={`Edit ${s.id} ${s.name}`} onClick={() => setEditing({ track: t.id, stage: s })}>
                        <Pencil className="size-3.5" />
                      </Button>
                    </li>
                  );
                })}
              </ol>
            </Card>
          </section>
        ))}
      </div>
      {editing && (
        <StageEditorDialog
          key={`${editing.track}:${editing.stage?.id ?? "new"}`}
          track={editing.track}
          stage={editing.stage}
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}
    </>
  );
}
