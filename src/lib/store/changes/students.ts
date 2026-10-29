import { createId } from "@/lib/id";
import { stageIndex } from "@/lib/students/ladder";
import type { ISODate, ISODateTime, PersistedData, Student, StudentInput, StudentLesson, StudentLessonInput, StudentStage, TrackId } from "@/types";

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
}

/** Removes the student with their stages and lesson notes; returns them so Undo can put everything back. */
export function deleteStudent(d: PersistedData, id: string): { data: PersistedData; removed: RemovedStudent } | null {
  const student = d.students.find((s) => s.id === id);
  if (!student) return null;
  return {
    removed: { student, stages: d.studentStages.filter((s) => s.studentId === id), lessons: d.studentLessons.filter((l) => l.studentId === id) },
    data: {
      ...d,
      students: d.students.filter((s) => s.id !== id),
      studentStages: d.studentStages.filter((s) => s.studentId !== id),
      studentLessons: d.studentLessons.filter((l) => l.studentId !== id),
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
  if (!d.students.some((s) => s.id === studentId) || stageIndex(track, stage) < 0) return d;
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
