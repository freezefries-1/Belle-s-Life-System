"use client";

import * as React from "react";
import Link from "next/link";
import { ListOrdered, Plus, Users } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StudentEditorDialog } from "@/components/students/student-editor-dialog";
import { LevelBadge, STUDENT_STATUSES, StudentFacts } from "@/components/students/student-visuals";
import { FilterSelect } from "@/components/tasks/task-filters";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { stageDef, type Ladder, type Level } from "@/lib/students/ladder";
import { checksOf, currentStages, durationSince, lessonsOf, levelOf, milestoneProgress, stageSummary } from "@/lib/students/student-model";
import { useLadder } from "@/lib/students/use-ladder";
import { useWorkspace } from "@/lib/store/workspace-store";
import type { Student, StudentStatus, Workspace } from "@/types";

type GroupFilter = "all" | "junior" | "adult";

const LEVELS: { level: Level; stages: string }[] = [
  { level: "Beginner", stages: "R1–R3" },
  { level: "High beginner", stages: "R4–R5" },
  { level: "Intermediate", stages: "R6–R7" },
  { level: "Advanced", stages: "R8" },
  { level: "Competitive", stages: "R9 + competitions" },
];

export function StudentsPage() {
  const { workspace } = useWorkspace();
  const ladder = useLadder();
  const [status, setStatus] = React.useState<StudentStatus>("active");
  const [group, setGroup] = React.useState<GroupFilter>("all");
  const [adding, setAdding] = React.useState(false);

  const counts = Object.fromEntries(STUDENT_STATUSES.map((s) => [s.value, workspace.students.filter((x) => x.status === s.value).length]));
  const visible = workspace.students
    .filter((x) => x.status === status && (group === "all" || x.group === group))
    .sort((a, b) => a.name.localeCompare(b.name));
  const active = workspace.students.filter((x) => x.status === "active");

  return (
    <>
      <PageHeader
        title="Students"
        description="Where each student is on the Rally, Serve, Net and Match play tracks, with your lesson notes."
        actions={
          <>
            <Button asChild variant="outline" className="gap-1.5">
              <Link href="/students/ladder">
                <ListOrdered className="size-4" />
                Coaching ladder
              </Link>
            </Button>
            <Button onClick={() => setAdding(true)} className="gap-1.5">
              <Plus className="size-4" strokeWidth={2.5} />
              Add student
            </Button>
          </>
        }
      />

      {workspace.students.length === 0 ? (
        <Card className="items-center py-12">
          <EmptyState icon={Users} title="No students yet" description="Add a student to track their stage on each track and keep lesson notes." className="py-0" />
          <Button className="mt-4" onClick={() => setAdding(true)}>
            Add your first student
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Tabs value={status} onValueChange={(v) => setStatus(v as StudentStatus)}>
                <TabsList>
                  {STUDENT_STATUSES.map((s) => (
                    <TabsTrigger standalone key={s.value} value={s.value}>
                      {s.label}
                      {counts[s.value] > 0 && <span className="text-muted-foreground tabular-nums">{counts[s.value]}</span>}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <FilterSelect
                label="Show"
                value={group}
                onChange={(v) => setGroup(v as GroupFilter)}
                options={[
                  { value: "all", label: "Juniors and adults" },
                  { value: "junior", label: "Juniors" },
                  { value: "adult", label: "Adults" },
                ]}
              />
            </div>
            {visible.length === 0 ? (
              <p className="rounded-xl border border-dashed bg-card/60 px-4 py-8 text-center text-[13px] text-muted-foreground">
                No {STUDENT_STATUSES.find((s) => s.value === status)?.label.toLowerCase()} students{group !== "all" ? ` in this group` : ""}.
              </p>
            ) : (
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-2" aria-label="Students">
                {visible.map((s) => (
                  <li key={s.id}>
                    <StudentCard student={s} workspace={workspace} ladder={ladder} />
                  </li>
                ))}
              </ul>
            )}
          </div>
          <aside className="min-w-0" aria-label="Levels">
            <Card className="p-5">
              <h3 className="text-[15px] font-semibold">Active students by level</h3>
              <p className="mt-1 text-xs text-muted-foreground">The level comes from the Rally stage.</p>
              <ul className="mt-3 flex flex-col gap-2 text-[13px]">
                {LEVELS.map((l) => (
                  <li key={l.level} className="flex items-center gap-2">
                    <LevelBadge level={l.level} />
                    <span className="flex-1 text-xs text-muted-foreground">{l.stages}</span>
                    <span className="font-semibold tabular-nums">{active.filter((x) => levelOf(ladder, workspace.studentStages, x.id) === l.level).length}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </aside>
        </div>
      )}
      {adding && <StudentEditorDialog open={adding} onOpenChange={setAdding} />}
    </>
  );
}

function StudentCard({ student, workspace, ladder }: { student: Student; workspace: Workspace; ladder: Ladder }) {
  const current = currentStages(ladder, workspace.studentStages, student.id);
  const level = levelOf(ladder, workspace.studentStages, student.id);
  const lastLesson = lessonsOf(workspace.studentLessons, student.id)[0];
  const summary = stageSummary(ladder, current);
  const rallyStage = current.rally ? stageDef(ladder, "rally", current.rally.stage) : null;
  const rallyProgress = rallyStage ? milestoneProgress(rallyStage, checksOf(workspace.studentChecks, student.id)) : null;
  return (
    <Link
      href={`/students/${student.id}`}
      className="flex h-full flex-col gap-2.5 rounded-xl border bg-card p-4 shadow-xs transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold">{student.name}</p>
          <StudentFacts student={student} short />
        </div>
        <LevelBadge level={level} />
      </div>
      <p className="text-[13px] font-medium tabular-nums">
        {summary || <span className="text-muted-foreground">No stages yet</span>}
        {rallyProgress && rallyProgress.total > 0 && (
          <span className={rallyProgress.complete ? "font-semibold text-emerald-700" : "font-normal text-muted-foreground"}>
            {" "}
            · {current.rally!.stage} milestones {rallyProgress.done}/{rallyProgress.total}
          </span>
        )}
      </p>
      <p className="mt-auto text-xs text-muted-foreground">
        {current.rally && `At ${current.rally.stage} for ${durationSince(current.rally.reachedOn, workspace.today)} · `}
        {lastLesson ? `Last lesson ${lastLesson.date === workspace.today ? "today" : `${durationSince(lastLesson.date, workspace.today)} ago`}` : "No lesson notes yet"}
      </p>
    </Link>
  );
}
