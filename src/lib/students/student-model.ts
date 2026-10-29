import { daysBetween } from "@/lib/date";
import { createId } from "@/lib/id";
import type { ISODate, ISODateTime, PersistedData, Student, StudentInput, StudentLesson, StudentLessonInput, StudentStage, TrackId } from "@/types";

import { TRACKS, overallLevel, stageIndex } from "./ladder";

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
export function currentStages(stages: StudentStage[], studentId: string): CurrentStages {
  const out = { rally: null, serve: null, net: null, match: null } as CurrentStages;
  for (const s of stages) {
    if (s.studentId !== studentId) continue;
    const at = stageIndex(s.track, s.stage);
    const best = out[s.track];
    if (at >= 0 && (!best || at > stageIndex(s.track, best.stage))) out[s.track] = s;
  }
  return out;
}

export function levelOf(stages: StudentStage[], studentId: string) {
  const c = currentStages(stages, studentId);
  return overallLevel(c.rally?.stage ?? null, c.match?.stage ?? null);
}

/** Every stage reached, newest first. */
export function stageHistory(stages: StudentStage[], studentId: string) {
  return stages
    .filter((s) => s.studentId === studentId)
    .sort((a, b) => b.reachedOn.localeCompare(a.reachedOn) || stageIndex(b.track, b.stage) - stageIndex(a.track, a.stage));
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
export function stageSummary(current: CurrentStages) {
  return TRACKS.map((t) => current[t.id]?.stage)
    .filter(Boolean)
    .join(" · ");
}

export const studentRecords = (d: PersistedData, studentId: string) => ({
  stages: d.studentStages.filter((s) => s.studentId === studentId),
  lessons: d.studentLessons.filter((l) => l.studentId === studentId),
});
