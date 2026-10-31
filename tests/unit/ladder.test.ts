import { describe, expect, it } from "vitest";

import { createSampleData } from "@/data/sample-data";
import { dataToRows, rowsToData } from "@/lib/repositories/mappers";
import { EMPTY_DATA, SCHEMA_VERSION, createEnvelope, parseEnvelope } from "@/lib/storage/schema";
import * as ladder from "@/lib/store/changes/ladder";
import * as students from "@/lib/store/changes/students";
import { DEFAULT_LADDER, buildLadder, builtInStage, nextStageId, overallLevel, stageDef } from "@/lib/students/ladder";
import { checksOf, createStudent, currentStages, milestoneProgress } from "@/lib/students/student-model";
import type { PersistedData } from "@/types";

import { local } from "./helpers";

const NOW = local("2026-10-31", 9);
const LATER = local("2026-10-31", 10);
const mia = createStudent({ name: "Mia" }, NOW);
const base: PersistedData = { ...EMPTY_DATA, students: [mia] };

describe("editing the ladder", () => {
  it("rewording a stage keeps its id and its existing milestone ids", () => {
    const r5 = stageDef(DEFAULT_LADDER, "rally", "R5")!;
    const d = ladder.saveLadderStage(
      base,
      "rally",
      "R5",
      { name: " Baseline solid ", focus: "Centre to centre", checks: [{ id: "R5-1", text: "25-ball rally" }, { text: "Recovers to the centre" }, { text: "  " }] },
      NOW,
    );
    const edited = stageDef(buildLadder(d.ladderStages), "rally", "R5")!;
    expect(edited).toMatchObject({ id: "R5", name: "Baseline solid", focus: "Centre to centre", builtIn: true, edited: true });
    expect(edited.checks.map((c) => c.text)).toEqual(["25-ball rally", "Recovers to the centre"]);
    expect(edited.checks[0].id).toBe(r5.checks[0].id);
    expect(edited.checks[1].id).not.toBe("");
    // Saving again updates the same record.
    const again = ladder.saveLadderStage(d, "rally", "R5", { name: "Baseline steady" }, LATER);
    expect(again.ladderStages).toHaveLength(1);
    expect(again.ladderStages[0]).toMatchObject({ name: "Baseline steady", createdAt: NOW, updatedAt: LATER });
  });

  it("reset puts the built-in wording back, and Undo restores the edit", () => {
    const d = ladder.saveLadderStage(base, "serve", "S2", { name: "Mini serve" }, NOW);
    const result = ladder.removeLadderStage(d, "serve", "S2")!;
    expect(stageDef(buildLadder(result.data.ladderStages), "serve", "S2")).toEqual(builtInStage("serve", "S2"));
    expect(stageDef(buildLadder(ladder.restoreLadderStage(result.data, result.removed).ladderStages), "serve", "S2")?.name).toBe("Mini serve");
  });

  it("adds stages at the end of a track, numbered on", () => {
    expect(nextStageId(DEFAULT_LADDER, "rally")).toBe("R10");
    const added = ladder.addLadderStage(base, "rally", { name: "Tournament ready", checks: [{ text: "Plays a full match plan" }] }, NOW)!;
    expect(added.stage).toBe("R10");
    const l = buildLadder(added.data.ladderStages);
    expect(l.rally.stages.at(-1)).toMatchObject({ id: "R10", name: "Tournament ready", builtIn: false });
    expect(nextStageId(l, "rally")).toBe("R11");
    expect(ladder.addLadderStage(base, "rally", { name: "  " }, NOW)).toBeNull();
  });

  it("a stage you added counts like R9 for the level", () => {
    const l = buildLadder(ladder.addLadderStage(base, "rally", { name: "Elite" }, NOW)!.data.ladderStages);
    expect(overallLevel(l, "R10", "M6")).toBe("Competitive");
  });

  it("a stage you added can't be deleted once a student has reached it, or while later stages exist", () => {
    let d = ladder.addLadderStage(base, "rally", { name: "Elite" }, NOW)!.data;
    d = ladder.addLadderStage(d, "rally", { name: "Pro" }, NOW)!.data;
    expect(ladder.removeLadderStage(d, "rally", "R10")).toBeNull(); // not the last
    const reached = students.setStage(d, mia.id, "rally", "R11", "2026-10-30", "", NOW);
    expect(ladder.removeLadderStage(reached, "rally", "R11")).toBeNull(); // in use
    const removed = ladder.removeLadderStage(d, "rally", "R11")!;
    expect(buildLadder(removed.data.ladderStages).rally.stages.at(-1)?.id).toBe("R10");
  });

  it("built-in stages can't be deleted (only reset), and unknown stages are ignored", () => {
    expect(ladder.removeLadderStage(base, "rally", "R3")).toBeNull();
    expect(ladder.saveLadderStage(base, "rally", "R99", { name: "x" }, NOW)).toBe(base);
  });

  it("students can be set to a stage you added", () => {
    const d = ladder.addLadderStage(base, "serve", { name: "Big serve" }, NOW)!.data;
    const set = students.setStage(d, mia.id, "serve", "S8", "2026-10-30", "", NOW);
    expect(currentStages(buildLadder(set.ladderStages), set.studentStages, mia.id).serve?.stage).toBe("S8");
  });
});

describe("milestones", () => {
  const l = DEFAULT_LADDER;
  const r5 = stageDef(l, "rally", "R5")!;

  it("ticking and unticking; one record per student and milestone", () => {
    let d = students.setStudentCheck(base, mia.id, "rally", "R5", "R5-1", "2026-10-20", NOW);
    expect(milestoneProgress(r5, checksOf(d.studentChecks, mia.id))).toEqual({ done: 1, total: 2, complete: false });
    d = students.setStudentCheck(d, mia.id, "rally", "R5", "R5-2", "2026-10-30", NOW);
    expect(milestoneProgress(r5, checksOf(d.studentChecks, mia.id)).complete).toBe(true);
    const redated = students.setStudentCheck(d, mia.id, "rally", "R5", "R5-1", "2026-10-25", LATER);
    expect(redated.studentChecks).toHaveLength(2);
    expect(checksOf(redated.studentChecks, mia.id).get("R5-1")?.doneOn).toBe("2026-10-25");
    const off = students.setStudentCheck(d, mia.id, "rally", "R5", "R5-1", null, LATER);
    expect(milestoneProgress(r5, checksOf(off.studentChecks, mia.id)).done).toBe(1);
    expect(students.setStudentCheck(base, "nobody", "rally", "R5", "R5-1", "2026-10-20", NOW)).toBe(base);
  });

  it("a stage with no milestones is never 'complete'", () => {
    expect(milestoneProgress(stageDef(l, "net", "N1")!, new Map())).toEqual({ done: 0, total: 0, complete: false });
  });

  it("removing a milestone from a stage means it no longer counts", () => {
    let d = students.setStudentCheck(base, mia.id, "rally", "R5", "R5-2", "2026-10-20", NOW);
    d = ladder.saveLadderStage(d, "rally", "R5", { name: "Baseline steady", checks: [{ id: "R5-1", text: "20-ball rally" }] }, NOW);
    const stage = stageDef(buildLadder(d.ladderStages), "rally", "R5")!;
    expect(milestoneProgress(stage, checksOf(d.studentChecks, mia.id))).toEqual({ done: 0, total: 1, complete: false });
  });

  it("deleting a student removes their ticks; Undo brings them back", () => {
    const d = students.setStudentCheck(base, mia.id, "rally", "R5", "R5-1", "2026-10-20", NOW);
    const result = students.deleteStudent(d, mia.id)!;
    expect(result.data.studentChecks).toHaveLength(0);
    expect(students.restoreStudent(result.data, result.removed).studentChecks).toHaveLength(1);
  });
});

describe("the ladder and milestones are saved everywhere", () => {
  const sample = parseEnvelope({ schemaVersion: SCHEMA_VERSION, data: createSampleData("2026-10-31") })!.data;

  it("sample data has a reworded stage and ticked milestones", () => {
    expect(sample.ladderStages.length).toBeGreaterThan(0);
    expect(sample.studentChecks.length).toBeGreaterThan(0);
  });

  it("round-trips through the cloud rows and the backup file unchanged", () => {
    expect(rowsToData(dataToRows(sample))).toEqual(sample);
    expect(parseEnvelope(JSON.parse(JSON.stringify(createEnvelope(sample))))!.data).toEqual(sample);
  });

  it("a version 6 backup loads with the built-in ladder", () => {
    const old = parseEnvelope({ schemaVersion: 6, data: { students: [] } })!;
    expect(old.data.ladderStages).toEqual([]);
    expect(old.data.studentChecks).toEqual([]);
  });

  it("bad ladder records are cleaned: id follows track and stage, duplicate milestone ids dropped", () => {
    const parsed = parseEnvelope({
      schemaVersion: SCHEMA_VERSION,
      data: {
        ladderStages: [
          { id: "wrong", track: "rally", stage: "R2", name: "Mini", checks: [{ id: "a", text: "x" }, { id: "a", text: "y" }, { text: "no id" }, "junk"], createdAt: NOW },
          { id: "x", track: "volley", stage: "V1", name: "No such track", createdAt: NOW },
        ],
      },
    })!;
    expect(parsed.data.ladderStages).toHaveLength(1);
    expect(parsed.data.ladderStages[0]).toMatchObject({ id: "rally:R2", checks: [{ id: "a", text: "x" }] });
  });
});
