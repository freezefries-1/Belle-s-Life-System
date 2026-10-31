import { daysBetween } from "@/lib/date";
import { createId } from "@/lib/id";
import type {
  ISODate,
  ISODateTime,
  PersistedData,
  Student,
  StudentCheck,
  StudentInput,
  StudentLesson,
  StudentLessonInput,
  StudentStage,
  TrackId,
} from "@/types";

import { overallLevel, stageIndex, type Ladder, type StageDef } from "./ladder";

export function createStudent(input: StudentInput, now: ISODateTime): Student {
  return {
    id: createId(),
    name: input.name.trim(),
    group: input.group ?? "adult",
    ball: input.ball ?? "yellow",
    hand: input.hand ?? null,
    backhand: input.backhand ?? null,
    startedOn: input.startedOn ?? null,
    goals: input.goals?.trim() ?? "",
    notes: input.notes?.trim() ?? "",
    status: input.status ?? "active",
    createdAt: now,
    updatedAt: now,
  };
}

export function createLesson(studentId: string, input: StudentLessonInput, now: ISODateTime): StudentLesson {
  return {
    id: createId(),
    studentId,
    date: input.date,
    focus: input.focus?.trim() ?? "",
    wentWell: input.wentWell?.trim() ?? "",
    workOn: input.workOn?.trim() ?? "",
    createdAt: now,
    updatedAt: now,
  };
}

export type CurrentStages = Record<TrackId, StudentStage | null>;

/** The furthest stage reached on each track (a correction is made by removing the wrong entry). */
export function currentStages(ladder: Ladder, stages: StudentStage[], studentId: string): CurrentStages {
  const out = { rally: null, serve: null, net: null, match: null } as CurrentStages;
  for (const s of stages) {
    if (s.studentId !== studentId) continue;
    const at = stageIndex(ladder, s.track, s.stage);
    const best = out[s.track];
    if (at >= 0 && (!best || at > stageIndex(ladder, s.track, best.stage))) out[s.track] = s;
  }
  return out;
}

export function levelOf(ladder: Ladder, stages: StudentStage[], studentId: string) {
  const c = currentStages(ladder, stages, studentId);
  return overallLevel(ladder, c.rally?.stage ?? null, c.match?.stage ?? null);
}

/** Every stage reached, newest first. */
export function stageHistory(ladder: Ladder, stages: StudentStage[], studentId: string) {
  return stages
    .filter((s) => s.studentId === studentId)
    .sort((a, b) => b.reachedOn.localeCompare(a.reachedOn) || stageIndex(ladder, b.track, b.stage) - stageIndex(ladder, a.track, a.stage));
}

/** Milestones a student has ticked, by milestone id. */
export function checksOf(checks: StudentCheck[], studentId: string) {
  return new Map(checks.filter((c) => c.studentId === studentId).map((c) => [c.checkId, c]));
}

/** How many of a stage's milestones are ticked (milestones you've since removed don't count). */
export function milestoneProgress(stage: StageDef, ticked: Map<string, StudentCheck>) {
  const done = stage.checks.filter((c) => ticked.has(c.id)).length;
  return { done, total: stage.checks.length, complete: stage.checks.length > 0 && done === stage.checks.length };
}

export function lessonsOf(lessons: StudentLesson[], studentId: string) {
  return lessons.filter((l) => l.studentId === studentId).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

/** "3 weeks", "5 months" — how long since a date, for "at this stage for …" and "last lesson …". */
export function durationSince(from: ISODate, today: ISODate) {
  const days = Math.max(0, daysBetween(from, today));
  if (days === 0) return "today";
  if (days < 14) return days === 1 ? "1 day" : `${days} days`;
  if (days < 61) return `${Math.round(days / 7)} weeks`;
  const months = Math.round(days / 30.4);
  return months < 24 ? `${months} months` : `${Math.round(days / 365)} years`;
}

/** Short summary for a student card, e.g. "R5 · S2 · N1 · M2". */
export function stageSummary(ladder: Ladder, current: CurrentStages) {
  return ladder.tracks.map((t) => current[t.id]?.stage)
    .filter(Boolean)
    .join(" · ");
}

export const studentRecords = (d: PersistedData, studentId: string) => ({
  stages: d.studentStages.filter((s) => s.studentId === studentId),
  lessons: d.studentLessons.filter((l) => l.studentId === studentId),
});
