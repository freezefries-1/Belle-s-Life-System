import { describe, expect, it } from "vitest";

import { createSampleData } from "@/data/sample-data";
import { dataToRows, rowsToData } from "@/lib/repositories/mappers";
import { EMPTY_DATA, SCHEMA_VERSION, createEnvelope, parseEnvelope } from "@/lib/storage/schema";
import * as students from "@/lib/store/changes/students";
import { DEFAULT_LADDER as L, overallLevel, stageIndex } from "@/lib/students/ladder";
import { createLesson, createStudent, currentStages, durationSince, levelOf, stageHistory, stageSummary } from "@/lib/students/student-model";
import { hasAnyData } from "@/lib/workspace-data";
import type { PersistedData } from "@/types";

import { local } from "./helpers";

const NOW = local("2026-10-29", 9);
const LATER = local("2026-10-29", 10);
const mia = createStudent({ name: " Mia ", group: "junior", ball: "orange" }, NOW);
const base: PersistedData = { ...EMPTY_DATA, students: [mia] };

describe("the ladder", () => {
  it("has the four tracks with unique stage ids in order", () => {
    expect(L.tracks.map((t) => t.id)).toEqual(["rally", "serve", "net", "match"]);
    expect(L.tracks.map((t) => t.stages.length)).toEqual([9, 7, 5, 6]);
    const ids = L.tracks.flatMap((t) => t.stages.map((s) => s.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(stageIndex(L, "rally", "R5")).toBe(4);
    expect(stageIndex(L, "serve", "R5")).toBe(-1);
    // Milestones have ids that never change: R5-1, R5-2…
    expect(L.rally.stages[4].checks.map((c) => c.id)).toEqual(["R5-1", "R5-2"]);
    const checkIds = L.tracks.flatMap((t) => t.stages.flatMap((s) => s.checks.map((c) => c.id)));
    expect(new Set(checkIds).size).toBe(checkIds.length);
  });

  it("works out the overall level from the Rally stage", () => {
    expect(overallLevel(L, null, null)).toBe("Not assessed");
    expect(["R1", "R2", "R3"].map((r) => overallLevel(L, r, null))).toEqual(["Beginner", "Beginner", "Beginner"]);
    expect(["R4", "R5"].map((r) => overallLevel(L, r, null))).toEqual(["High beginner", "High beginner"]);
    expect(["R6", "R7"].map((r) => overallLevel(L, r, null))).toEqual(["Intermediate", "Intermediate"]);
    expect(overallLevel(L, "R8", "M6")).toBe("Advanced");
  });

  it("only calls R9 Competitive with competition play (M5 or above)", () => {
    expect(overallLevel(L, "R9", null)).toBe("Advanced");
    expect(overallLevel(L, "R9", "M4")).toBe("Advanced");
    expect(overallLevel(L, "R9", "M5")).toBe("Competitive");
  });
});

describe("students", () => {
  it("are created tidy, with sensible defaults", () => {
    expect(mia).toMatchObject({ name: "Mia", group: "junior", ball: "orange", status: "active", hand: null, goals: "" });
    expect(createStudent({ name: "Daniel" }, NOW)).toMatchObject({ group: "adult", ball: "yellow" });
  });

  it("count as data (so sample data never replaces them)", () => {
    expect(hasAnyData(base)).toBe(true);
  });

  it("reaching stages: the furthest stage counts, one entry per stage", () => {
    let d = students.setStage(base, mia.id, "rally", "R2", "2026-09-01", "", NOW);
    d = students.setStage(d, mia.id, "rally", "R3", "2026-10-20", " short court 20 ", NOW);
    d = students.setStage(d, mia.id, "serve", "S1", "2026-08-01", "", NOW);
    const current = currentStages(L, d.studentStages, mia.id);
    expect(current.rally).toMatchObject({ stage: "R3", note: "short court 20" });
    expect(current.serve?.stage).toBe("S1");
    expect(current.net).toBeNull();
    expect(stageSummary(L, current)).toBe("R3 · S1");
    expect(levelOf(L, d.studentStages, mia.id)).toBe("Beginner");
    // Setting R2 again only changes its date.
    const again = students.setStage(d, mia.id, "rally", "R2", "2026-09-05", "", LATER);
    expect(again.studentStages).toHaveLength(3);
    expect(again.studentStages.find((s) => s.stage === "R2")).toMatchObject({ reachedOn: "2026-09-05", updatedAt: LATER });
  });

  it("ignores stages that aren't on the ladder, or students that don't exist", () => {
    expect(students.setStage(base, mia.id, "rally", "S3", "2026-10-01", "", NOW)).toBe(base);
    expect(students.setStage(base, "nobody", "rally", "R1", "2026-10-01", "", NOW)).toBe(base);
  });

  it("history is newest first; removing an entry steps back to the previous stage", () => {
    let d = students.setStage(base, mia.id, "rally", "R2", "2026-09-01", "", NOW);
    d = students.setStage(d, mia.id, "rally", "R3", "2026-10-20", "", NOW);
    expect(stageHistory(L, d.studentStages, mia.id).map((s) => s.stage)).toEqual(["R3", "R2"]);
    const r3 = d.studentStages.find((s) => s.stage === "R3")!;
    const back = students.removeStage(d, r3.id);
    expect(currentStages(L, back.studentStages, mia.id).rally?.stage).toBe("R2");
    expect(students.restoreStage(back, r3).studentStages).toHaveLength(2);
  });

  it("deleting a student removes their stages and lessons; Undo brings everything back", () => {
    let d = students.setStage(base, mia.id, "rally", "R2", "2026-09-01", "", NOW);
    d = students.addLesson(d, createLesson(mia.id, { date: "2026-10-28", focus: "Bounce" }, NOW));
    const result = students.deleteStudent(d, mia.id)!;
    expect(result.data.students).toHaveLength(0);
    expect(result.data.studentStages).toHaveLength(0);
    expect(result.data.studentLessons).toHaveLength(0);
    expect(students.restoreStudent(result.data, result.removed)).toEqual({ ...d, students: [mia], studentStages: d.studentStages, studentLessons: d.studentLessons });
  });

  it("lessons: add, edit, delete and restore; never for a missing student", () => {
    const lesson = createLesson(mia.id, { date: "2026-10-28", focus: " Serve toss " }, NOW);
    let d = students.addLesson(base, lesson);
    expect(d.studentLessons[0].focus).toBe("Serve toss");
    d = students.updateLesson(d, lesson.id, { workOn: "20 tosses at home" }, LATER);
    expect(d.studentLessons[0]).toMatchObject({ focus: "Serve toss", workOn: "20 tosses at home", updatedAt: LATER });
    const gone = students.deleteLesson(d, lesson.id);
    expect(gone.studentLessons).toHaveLength(0);
    expect(students.restoreLesson(gone, d.studentLessons[0]).studentLessons).toHaveLength(1);
    expect(students.addLesson(EMPTY_DATA, lesson)).toBe(EMPTY_DATA);
  });

  it("durations read naturally", () => {
    expect(durationSince("2026-10-29", "2026-10-29")).toBe("today");
    expect(durationSince("2026-10-28", "2026-10-29")).toBe("1 day");
    expect(durationSince("2026-10-01", "2026-10-29")).toBe("4 weeks");
    expect(durationSince("2026-04-29", "2026-10-29")).toBe("6 months");
  });
});

describe("students are saved everywhere", () => {
  const sample = parseEnvelope({ schemaVersion: SCHEMA_VERSION, data: createSampleData("2026-10-29") })!.data;

  it("the sample data includes students, stages and lessons", () => {
    expect(sample.students.length).toBe(3);
    expect(sample.studentStages.length).toBeGreaterThan(0);
    expect(sample.studentLessons.length).toBe(3);
  });

  it("round-trips through the cloud rows and the backup file unchanged", () => {
    expect(rowsToData(dataToRows(sample))).toEqual(sample);
    expect(parseEnvelope(JSON.parse(JSON.stringify(createEnvelope(sample))))!.data).toEqual(sample);
  });

  it("an older (version 5) backup still loads, with no students", () => {
    const old = parseEnvelope({ schemaVersion: 5, data: { tasks: [], captures: [] } })!;
    expect(old.data.students).toEqual([]);
    expect(old.migratedFrom).toBe(5);
  });

  it("stages and lessons of a missing student are set aside, and duplicates merged", () => {
    const d = students.setStage(base, mia.id, "rally", "R2", "2026-09-01", "", NOW);
    const orphan = { ...d.studentStages[0], id: "x1", studentId: "gone" };
    const dupe = { ...d.studentStages[0], id: "x2", updatedAt: LATER };
    const parsed = parseEnvelope({ schemaVersion: SCHEMA_VERSION, data: { ...d, studentStages: [...d.studentStages, orphan, dupe] } })!;
    expect(parsed.data.studentStages.map((s) => s.id)).toEqual(["x2"]);
    expect(parsed.removed.studentRecords).toBe(1);
  });
});
