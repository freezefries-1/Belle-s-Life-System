import { createId } from "@/lib/id";
import { buildLadder, stageIndex } from "@/lib/students/ladder";
import type {
  ISODate,
  ISODateTime,
  PersistedData,
  Student,
  StudentBenchmark,
  StudentBenchmarkInput,
  StudentCheck,
  StudentInput,
  StudentMatch,
  StudentMatchInput,
  StudentRating,
  StudentRatingInput,
  StudentLesson,
  StudentLessonInput,
  StudentStage,
  TrackId,
} from "@/types";

/**
 * Student changes. Like the other change helpers, each takes the current data
 * and returns the next version (the same object when nothing changes).
 */

export const addStudent = (d: PersistedData, student: Student): PersistedData => ({ ...d, students: [...d.students, student] });

export function updateStudent(d: PersistedData, id: string, changes: Partial<StudentInput>, now: ISODateTime): PersistedData {
  if (!d.students.some((s) => s.id === id)) return d;
  return {
    ...d,
    students: d.students.map((s) =>
      s.id === id
        ? {
            ...s,
            ...changes,
            name: changes.name?.trim() || s.name,
            goals: changes.goals !== undefined ? changes.goals.trim() : s.goals,
            notes: changes.notes !== undefined ? changes.notes.trim() : s.notes,
            updatedAt: now,
          }
        : s,
    ),
  };
}

export interface RemovedStudent {
  student: Student;
  stages: StudentStage[];
  lessons: StudentLesson[];
  checks: StudentCheck[];
  matches: StudentMatch[];
  benchmarks: StudentBenchmark[];
  ratings: StudentRating[];
}

/** Removes the student with their stages and lesson notes; returns them so Undo can put everything back. */
export function deleteStudent(d: PersistedData, id: string): { data: PersistedData; removed: RemovedStudent } | null {
  const student = d.students.find((s) => s.id === id);
  if (!student) return null;
  return {
    removed: {
      student,
      stages: d.studentStages.filter((s) => s.studentId === id),
      lessons: d.studentLessons.filter((l) => l.studentId === id),
      checks: d.studentChecks.filter((c) => c.studentId === id),
      matches: d.studentMatches.filter((m) => m.studentId === id),
      benchmarks: d.studentBenchmarks.filter((b) => b.studentId === id),
      ratings: d.studentRatings.filter((r) => r.studentId === id),
    },
    data: {
      ...d,
      students: d.students.filter((s) => s.id !== id),
      studentStages: d.studentStages.filter((s) => s.studentId !== id),
      studentLessons: d.studentLessons.filter((l) => l.studentId !== id),
      studentChecks: d.studentChecks.filter((c) => c.studentId !== id),
      studentMatches: d.studentMatches.filter((m) => m.studentId !== id),
      studentBenchmarks: d.studentBenchmarks.filter((b) => b.studentId !== id),
      studentRatings: d.studentRatings.filter((r) => r.studentId !== id),
    },
  };
}

export function restoreStudent(d: PersistedData, removed: RemovedStudent): PersistedData {
  if (d.students.some((s) => s.id === removed.student.id)) return d;
  return {
    ...d,
    students: [...d.students, removed.student],
    studentStages: [...d.studentStages, ...removed.stages],
    studentLessons: [...d.studentLessons, ...removed.lessons],
    studentChecks: [...d.studentChecks, ...(removed.checks ?? [])],
    studentMatches: [...d.studentMatches, ...(removed.matches ?? [])],
    studentBenchmarks: [...d.studentBenchmarks, ...(removed.benchmarks ?? [])],
    studentRatings: [...d.studentRatings, ...(removed.ratings ?? [])],
  };
}

/**
 * Record that a student reached a stage on a track, on a date. Reaching the
 * same stage again only updates its date and note, so there's one entry per
 * student, track and stage.
 */
export function setStage(
  d: PersistedData,
  studentId: string,
  track: TrackId,
  stage: string,
  reachedOn: ISODate,
  note: string,
  now: ISODateTime,
): PersistedData {
  if (!d.students.some((s) => s.id === studentId) || stageIndex(buildLadder(d.ladderStages), track, stage) < 0) return d;
  const existing = d.studentStages.find((s) => s.studentId === studentId && s.track === track && s.stage === stage);
  if (existing) {
    return {
      ...d,
      studentStages: d.studentStages.map((s) => (s.id === existing.id ? { ...s, reachedOn, note: note.trim(), updatedAt: now } : s)),
    };
  }
  const entry: StudentStage = { id: createId(), studentId, track, stage, reachedOn, note: note.trim(), createdAt: now, updatedAt: now };
  return { ...d, studentStages: [...d.studentStages, entry] };
}

export const removeStage = (d: PersistedData, id: string): PersistedData => ({ ...d, studentStages: d.studentStages.filter((s) => s.id !== id) });

export const restoreStage = (d: PersistedData, stage: StudentStage): PersistedData =>
  d.studentStages.some((s) => s.id === stage.id) || !d.students.some((s) => s.id === stage.studentId)
    ? d
    : { ...d, studentStages: [...d.studentStages, stage] };

export const addLesson = (d: PersistedData, lesson: StudentLesson): PersistedData =>
  d.students.some((s) => s.id === lesson.studentId) ? { ...d, studentLessons: [...d.studentLessons, lesson] } : d;

export function updateLesson(d: PersistedData, id: string, changes: Partial<StudentLessonInput>, now: ISODateTime): PersistedData {
  if (!d.studentLessons.some((l) => l.id === id)) return d;
  return {
    ...d,
    studentLessons: d.studentLessons.map((l) =>
      l.id === id
        ? {
            ...l,
            date: changes.date ?? l.date,
            focus: changes.focus !== undefined ? changes.focus.trim() : l.focus,
            wentWell: changes.wentWell !== undefined ? changes.wentWell.trim() : l.wentWell,
            workOn: changes.workOn !== undefined ? changes.workOn.trim() : l.workOn,
            updatedAt: now,
          }
        : l,
    ),
  };
}

export const deleteLesson = (d: PersistedData, id: string): PersistedData => ({ ...d, studentLessons: d.studentLessons.filter((l) => l.id !== id) });

export const restoreLesson = (d: PersistedData, lesson: StudentLesson): PersistedData =>
  d.studentLessons.some((l) => l.id === lesson.id) ? d : addLesson(d, lesson);

/**
 * Tick (or untick) a milestone for a student. One record per student and
 * milestone; ticking again only changes the date.
 */
export function setStudentCheck(
  d: PersistedData,
  studentId: string,
  track: TrackId,
  stage: string,
  checkId: string,
  done: ISODate | null,
  now: ISODateTime,
): PersistedData {
  if (!d.students.some((s) => s.id === studentId)) return d;
  const existing = d.studentChecks.find((c) => c.studentId === studentId && c.checkId === checkId);
  if (done === null) return existing ? { ...d, studentChecks: d.studentChecks.filter((c) => c.id !== existing.id) } : d;
  if (existing) {
    return existing.doneOn === done ? d : { ...d, studentChecks: d.studentChecks.map((c) => (c.id === existing.id ? { ...c, doneOn: done, updatedAt: now } : c)) };
  }
  const check: StudentCheck = { id: createId(), studentId, track, stage, checkId, doneOn: done, createdAt: now, updatedAt: now };
  return { ...d, studentChecks: [...d.studentChecks, check] };
}

/* ---------------- matches ---------------- */

const hasStudent = (d: PersistedData, id: string) => d.students.some((s) => s.id === id);

export const addMatch = (d: PersistedData, match: StudentMatch): PersistedData =>
  hasStudent(d, match.studentId) ? { ...d, studentMatches: [...d.studentMatches, match] } : d;

export function updateMatch(d: PersistedData, id: string, input: StudentMatchInput, now: ISODateTime): PersistedData {
  if (!d.studentMatches.some((m) => m.id === id)) return d;
  return {
    ...d,
    studentMatches: d.studentMatches.map((m) =>
      m.id === id
        ? {
            ...m,
            ...input,
            event: input.event.trim(),
            opponent: input.opponent.trim(),
            partner: input.partner.trim(),
            score: input.score.trim(),
            notes: input.notes.trim(),
            updatedAt: now,
          }
        : m,
    ),
  };
}

export const deleteMatch = (d: PersistedData, id: string): PersistedData => ({ ...d, studentMatches: d.studentMatches.filter((m) => m.id !== id) });

export const restoreMatch = (d: PersistedData, match: StudentMatch): PersistedData =>
  d.studentMatches.some((m) => m.id === match.id) ? d : addMatch(d, match);

/* ---------------- benchmark results ---------------- */

export const addBenchmark = (d: PersistedData, result: StudentBenchmark): PersistedData =>
  hasStudent(d, result.studentId) ? { ...d, studentBenchmarks: [...d.studentBenchmarks, result] } : d;

export function updateBenchmark(d: PersistedData, id: string, input: StudentBenchmarkInput, now: ISODateTime): PersistedData {
  if (!d.studentBenchmarks.some((b) => b.id === id)) return d;
  return {
    ...d,
    studentBenchmarks: d.studentBenchmarks.map((b) => (b.id === id ? { ...b, ...input, name: input.name.trim(), note: input.note.trim(), updatedAt: now } : b)),
  };
}

export const deleteBenchmark = (d: PersistedData, id: string): PersistedData => ({
  ...d,
  studentBenchmarks: d.studentBenchmarks.filter((b) => b.id !== id),
});

export const restoreBenchmark = (d: PersistedData, result: StudentBenchmark): PersistedData =>
  d.studentBenchmarks.some((b) => b.id === result.id) ? d : addBenchmark(d, result);

/* ---------------- ratings (e.g. DUPR) ---------------- */

export const addRating = (d: PersistedData, rating: StudentRating): PersistedData =>
  hasStudent(d, rating.studentId) ? { ...d, studentRatings: [...d.studentRatings, rating] } : d;

export function updateRating(d: PersistedData, id: string, input: StudentRatingInput, now: ISODateTime): PersistedData {
  if (!d.studentRatings.some((r) => r.id === id)) return d;
  return {
    ...d,
    studentRatings: d.studentRatings.map((r) =>
      r.id === id ? { ...r, ...input, rating: Math.round(input.rating * 1000) / 1000, note: input.note.trim(), updatedAt: now } : r,
    ),
  };
}

export const deleteRating = (d: PersistedData, id: string): PersistedData => ({ ...d, studentRatings: d.studentRatings.filter((r) => r.id !== id) });

export const restoreRating = (d: PersistedData, rating: StudentRating): PersistedData =>
  d.studentRatings.some((r) => r.id === rating.id) ? d : addRating(d, rating);

/** Your own profile for a sport (there's at most one). */
export const selfProfile = (d: Pick<PersistedData, "students">, sport: Student["sport"]) => d.students.find((s) => s.isSelf && s.sport === sport) ?? null;
