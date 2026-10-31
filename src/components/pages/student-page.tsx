"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowUp, MoreHorizontal, NotebookPen, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { LessonDialog } from "@/components/students/lesson-dialog";
import { SetStageDialog } from "@/components/students/set-stage-dialog";
import { StudentEditorDialog } from "@/components/students/student-editor-dialog";
import { LevelBadge, STUDENT_STATUSES, StudentFacts } from "@/components/students/student-visuals";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatLongDate, formatShortDate } from "@/lib/date";
import { stageDef, stageIndex, type TrackDef } from "@/lib/students/ladder";
import { checksOf, currentStages, durationSince, lessonsOf, levelOf, milestoneProgress, stageHistory } from "@/lib/students/student-model";
import { useLadder } from "@/lib/students/use-ladder";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";
import type { Student, StudentCheck, StudentLesson, StudentStage, TrackId } from "@/types";

type StageTarget = { track: TrackId; initial?: string };

export function StudentPage() {
  const { workspace, actions } = useWorkspace();
  const ladder = useLadder();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const student = workspace.students.find((s) => s.id === params.id);
  const [editing, setEditing] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [lesson, setLesson] = React.useState<StudentLesson | "new" | null>(null);
  const [stageTarget, setStageTarget] = React.useState<StageTarget | null>(null);

  if (!student) {
    return (
      <div className="flex flex-col items-start gap-4">
        <h2 className="text-2xl font-bold">Student not found</h2>
        <p className="text-[13px] text-muted-foreground">They may have been deleted.</p>
        <Button asChild variant="outline">
          <Link href="/students">Back to Students</Link>
        </Button>
      </div>
    );
  }

  const current = currentStages(ladder, workspace.studentStages, student.id);
  const level = levelOf(ladder, workspace.studentStages, student.id);
  const lessons = lessonsOf(workspace.studentLessons, student.id);
  const history = stageHistory(ladder, workspace.studentStages, student.id);
  const ticked = checksOf(workspace.studentChecks, student.id);

  function moveUp(track: TrackDef) {
    const at = current[track.id] ? stageIndex(ladder, track.id, current[track.id]!.stage) : -1;
    const next = track.stages[at + 1];
    if (!next || !student) return;
    const saved = actions.setStudentStage(student.id, track.id, next.id, workspace.today);
    if (!saved) return;
    toast(`${student.name}: ${next.id} · ${next.name}`, {
      description: `${track.name} track, today`,
      action: saved.created ? { label: "Undo", onClick: () => actions.removeStudentStage(saved.entry.id) } : undefined,
    });
  }

  function removeHistory(entry: StudentStage) {
    const removed = actions.removeStudentStage(entry.id);
    if (!removed) return;
    toast("Stage entry removed", {
      description: `${removed.stage} · ${stageDef(ladder, removed.track, removed.stage)?.name ?? ""}`,
      action: { label: "Undo", onClick: () => actions.restoreStudentStage(removed) },
    });
  }

  function removeLesson(l: StudentLesson) {
    const removed = actions.deleteLesson(l.id);
    if (!removed) return;
    toast("Lesson note deleted", { description: formatLongDate(removed.date), action: { label: "Undo", onClick: () => actions.restoreLesson(removed) } });
  }

  function deleteStudent() {
    if (!student) return;
    const removed = actions.deleteStudent(student.id);
    setDeleting(false);
    router.push("/students");
    if (removed) toast("Student deleted", { description: removed.student.name, action: { label: "Undo", onClick: () => actions.restoreStudent(removed) } });
  }

  return (
    <div className="flex flex-col gap-5">
      <Link href="/students" className="inline-flex items-center gap-1.5 self-start text-xs font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" />
        All students
      </Link>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[24px] leading-tight font-bold tracking-tight lg:text-[28px]">{student.name}</h2>
              <LevelBadge level={level} />
              {student.status !== "active" && <Badge variant="secondary">{STUDENT_STATUSES.find((s) => s.value === student.status)?.label}</Badge>}
            </div>
            <div className="mt-1.5">
              <StudentFacts student={student} />
            </div>
            {student.startedOn && (
              <p className="mt-1 text-xs text-muted-foreground">
                Started {formatShortDate(student.startedOn)} {student.startedOn.slice(0, 4)} · {durationSince(student.startedOn, workspace.today)} of lessons
              </p>
            )}
            {student.goals && (
              <p className="mt-3 max-w-2xl text-[13.5px]">
                <span className="font-semibold">Goals: </span>
                {student.goals}
              </p>
            )}
            {student.notes && <p className="mt-1 max-w-2xl text-[13px] whitespace-pre-line text-muted-foreground">{student.notes}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button onClick={() => setLesson("new")} className="gap-1.5">
              <NotebookPen className="size-4" />
              Lesson note
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label={`More actions for ${student.name}`}>
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onSelect={() => setEditing(true)}>
                  <Pencil />
                  Edit details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setDeleting(true)} className="text-rose-700 focus:text-rose-800">
                  <Trash2 className="text-rose-500" />
                  Delete student
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Card>

      <section aria-labelledby="tracks-heading" className="flex flex-col gap-3">
        <h3 id="tracks-heading" className="text-base font-semibold">
          Tracks
        </h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {ladder.tracks.map((t) => (
            <TrackCard
              key={t.id}
              track={t}
              entry={current[t.id]}
              ticked={ticked}
              onToggle={(stage, checkId, done) => actions.setStudentCheck(student.id, t.id, stage, checkId, done ? workspace.today : null)}
              today={workspace.today}
              onMoveUp={() => moveUp(t)}
              onChoose={() => setStageTarget({ track: t.id })}
            />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
        <section aria-labelledby="lessons-heading" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 id="lessons-heading" className="text-base font-semibold">
              Lesson notes
            </h3>
            <Button variant="outline" size="sm" onClick={() => setLesson("new")}>
              Add note
            </Button>
          </div>
          {lessons.length === 0 ? (
            <p className="rounded-xl border border-dashed bg-card/60 px-4 py-6 text-center text-[13px] text-muted-foreground">
              No lesson notes yet. After a lesson, jot down what you worked on and what’s next.
            </p>
          ) : (
            <Card className="overflow-hidden">
              <ul className="divide-y" aria-label="Lesson notes">
                {lessons.map((l) => (
                  <li key={l.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                    <div className="min-w-0 flex-1 text-[13px]">
                      <p className="text-xs font-semibold text-muted-foreground">{formatLongDate(l.date)}</p>
                      {l.focus && <p className="mt-0.5 font-semibold">{l.focus}</p>}
                      {l.wentWell && (
                        <p className="mt-0.5 whitespace-pre-line">
                          <span className="text-muted-foreground">Went well: </span>
                          {l.wentWell}
                        </p>
                      )}
                      {l.workOn && (
                        <p className="mt-0.5 whitespace-pre-line">
                          <span className="text-muted-foreground">Next: </span>
                          {l.workOn}
                        </p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-xs" aria-label={`Actions for the lesson note of ${formatLongDate(l.date)}`}>
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onSelect={() => setLesson(l)}>
                          <Pencil />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => removeLesson(l)} className="text-rose-700 focus:text-rose-800">
                          <Trash2 className="text-rose-500" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>

        <section aria-labelledby="history-heading" className="flex flex-col gap-3">
          <h3 id="history-heading" className="text-base font-semibold">
            Progress history
          </h3>
          {history.length === 0 ? (
            <p className="rounded-xl border border-dashed bg-card/60 px-4 py-6 text-center text-[13px] text-muted-foreground">
              Stages appear here as {student.name} reaches them.
            </p>
          ) : (
            <Card className="overflow-hidden">
              <ol className="divide-y" aria-label="Progress history">
                {history.map((h) => (
                  <li key={h.id} className="flex items-start gap-3 px-4 py-2.5 text-[13px] sm:px-5">
                    <span className="w-14 shrink-0 pt-px text-xs text-muted-foreground tabular-nums">{formatShortDate(h.reachedOn)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold">
                        {h.stage} · {stageDef(ladder, h.track, h.stage)?.name ?? h.stage}
                      </span>
                      <span className="text-muted-foreground"> · {ladder[h.track].name}</span>
                      {h.note && <span className="block text-xs text-muted-foreground">{h.note}</span>}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-xs" aria-label={`Actions for ${h.stage} on ${formatShortDate(h.reachedOn)}`}>
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onSelect={() => setStageTarget({ track: h.track, initial: h.stage })}>
                          <Pencil />
                          Change date or note
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => removeHistory(h)} className="text-rose-700 focus:text-rose-800">
                          <Trash2 className="text-rose-500" />
                          Remove entry
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </section>
      </div>

      {editing && <StudentEditorDialog student={student} open={editing} onOpenChange={setEditing} />}
      {lesson && <LessonDialog student={student} lesson={lesson === "new" ? undefined : lesson} open={!!lesson} onOpenChange={(o) => !o && setLesson(null)} />}
      {stageTarget && (
        <SetStageDialog
          student={student}
          track={stageTarget.track}
          current={current[stageTarget.track]?.stage ?? null}
          initialStage={stageTarget.initial}
          open={!!stageTarget}
          onOpenChange={(o) => !o && setStageTarget(null)}
        />
      )}
      <DeleteStudentDialog student={student} open={deleting} onOpenChange={setDeleting} onConfirm={deleteStudent} lessons={lessons.length} />
    </div>
  );
}

function TrackCard({
  track,
  entry,
  ticked,
  onToggle,
  today,
  onMoveUp,
  onChoose,
}: {
  track: TrackDef;
  entry: StudentStage | null;
  ticked: Map<string, StudentCheck>;
  onToggle: (stage: string, checkId: string, done: boolean) => void;
  today: string;
  onMoveUp: () => void;
  onChoose: () => void;
}) {
  const at = entry ? track.stages.findIndex((s) => s.id === entry.stage) : -1;
  const stage = entry ? track.stages[at] : null;
  const next = track.stages[at + 1] ?? null;
  const progress = stage ? milestoneProgress(stage, ticked) : null;
  return (
    <Card className="gap-3 p-4 sm:p-5" aria-labelledby={`track-${track.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p id={`track-${track.id}`} className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {track.name}
          </p>
          <p className="mt-0.5 text-[15px] font-semibold">{stage ? `${stage.id} · ${stage.name}` : "Not started"}</p>
          {entry && (
            <p className="text-xs text-muted-foreground">
              Since {formatShortDate(entry.reachedOn)} · {durationSince(entry.reachedOn, today)}
            </p>
          )}
        </div>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {at + 1} of {track.stages.length}
        </span>
      </div>
      <div className="flex gap-1" role="img" aria-label={`${track.name}: stage ${at + 1} of ${track.stages.length}`}>
        {track.stages.map((s, i) => (
          <span key={s.id} className={cn("h-1.5 flex-1 rounded-full", i <= at ? "bg-primary" : "bg-muted")} />
        ))}
      </div>
      {stage && (
        <div className="text-[13px]">
          <p>
            <span className="text-muted-foreground">Working on: </span>
            {stage.focus}
          </p>
        </div>
      )}
      {stage && progress && progress.total > 0 && (
        <fieldset className="rounded-lg bg-muted/40 px-3 py-2.5">
          <legend className="sr-only">
            {stage.id} milestones for {track.name}
          </legend>
          <p className="flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-muted-foreground">Ready to move on when</span>
            <span className={cn("tabular-nums", progress.complete ? "font-semibold text-emerald-700" : "text-muted-foreground")}>
              {progress.done} of {progress.total}
            </span>
          </p>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {stage.checks.map((c) => {
              const done = ticked.get(c.id);
              const id = `check-${track.id}-${c.id}`;
              return (
                <li key={c.id} className="flex items-start gap-2.5 text-[13px]">
                  <Checkbox id={id} checked={!!done} onCheckedChange={(v) => onToggle(stage.id, c.id, v === true)} className="mt-0.5" />
                  <label htmlFor={id} className={cn("min-w-0 flex-1 cursor-pointer", done && "text-muted-foreground")}>
                    {c.text}
                    {done && <span className="ml-1.5 text-xs whitespace-nowrap text-emerald-700">✓ {formatShortDate(done.doneOn)}</span>}
                  </label>
                </li>
              );
            })}
          </ul>
          {progress.complete && next && (
            <p role="status" className="mt-2 text-xs font-semibold text-emerald-700">
              All milestones reached: ready to move up to {next.id}.
            </p>
          )}
        </fieldset>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        {next ? (
          <Button size="sm" variant={entry ? "default" : "outline"} className="gap-1" onClick={entry ? onMoveUp : onChoose}>
            {entry ? (
              <>
                <ArrowUp className="size-3.5" />
                Moved up to {next.id}
              </>
            ) : (
              "Set starting stage"
            )}
          </Button>
        ) : (
          <span className="text-xs font-semibold text-emerald-700">Top of the {track.name} track</span>
        )}
        {entry && (
          <Button size="sm" variant="outline" onClick={onChoose}>
            Choose stage…
          </Button>
        )}
      </div>
    </Card>
  );
}

function DeleteStudentDialog({
  student,
  lessons,
  open,
  onOpenChange,
  onConfirm,
}: {
  student: Student;
  lessons: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete {student.name}?</DialogTitle>
          <DialogDescription>
            This deletes {student.name}, their progress history{lessons ? ` and ${lessons} lesson ${lessons === 1 ? "note" : "notes"}` : ""}. If they’ve just
            stopped lessons, you can set their status to Paused or Finished instead (Edit details), which keeps everything.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="bg-rose-600 hover:bg-rose-700" onClick={onConfirm}>
            Delete student
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
