import { describe, expect, it } from "vitest";

import { createSampleData } from "@/data/sample-data";
import { dataToRows, rowsToData } from "@/lib/repositories/mappers";
import { EMPTY_DATA, SCHEMA_VERSION, createEnvelope, parseEnvelope } from "@/lib/storage/schema";
import * as ladder from "@/lib/store/changes/ladder";
import * as students from "@/lib/store/changes/students";
import { DEFAULT_LADDER, buildLadder, stageDef } from "@/lib/students/ladder";
import {
  PICKLEBALL_TESTS,
  availableTests,
  createBenchmark,
  createMatch,
  createRating,
  focusNext,
  formatRating,
  kapOf,
  kapSummary,
  nextLevel,
  partnerRecords,
  pointLossSummary,
  ratingHistory,
} from "@/lib/students/performance";
import { createStudent, currentStages } from "@/lib/students/student-model";
import type { PersistedData, StudentMatchInput } from "@/types";

import { local } from "./helpers";

const NOW = local("2026-11-04", 9);
const me = createStudent({ name: "Me", sport: "pickleball", isSelf: true }, NOW);
const base: PersistedData = { ...EMPTY_DATA, students: [me] };

const doubles = (over: Partial<StudentMatchInput>): StudentMatchInput => ({
  playedOn: "2026-10-20",
  kind: "club",
  event: "",
  opponent: "",
  result: "win",
  score: "11-7",
  firstIn: null,
  firstTotal: null,
  secondIn: null,
  secondTotal: null,
  doubleFaults: null,
  unforcedErrors: null,
  winners: null,
  notes: "",
  format: "doubles",
  partner: "Jess",
  rated: true,
  pointLosses: {},
  kapStats: {},
  ...over,
});

describe("the pickleball ladder", () => {
  const pb = buildLadder([], "pickleball");

  it("has its own five tracks, separate from tennis", () => {
    expect(pb.tracks.map((t) => t.id)).toEqual(["kitchen", "transition", "serve_return", "hands", "play"]);
    expect(DEFAULT_LADDER.tracks.map((t) => t.id)).toEqual(["rally", "serve", "net", "match"]);
    expect(pb.play.stages.at(-1)?.name).toBe("PPA main draw");
  });

  it("stages and milestones work like the tennis ladder (ids, editing, adding)", () => {
    expect(stageDef(pb, "transition", "T2")?.checks.map((c) => c.id)).toEqual(["T2-1", "T2-2", "T2-3"]);
    let d = students.setStage(base, me.id, "transition", "T2", "2026-10-01", "", NOW);
    expect(currentStages(pb, d.studentStages, me.id).transition?.stage).toBe("T2");
    d = ladder.saveLadderStage(d, "kitchen", "K2", { name: "Patient dinking (Anna's version)" }, NOW);
    expect(stageDef(buildLadder(d.ladderStages, "pickleball"), "kitchen", "K2")?.name).toBe("Patient dinking (Anna's version)");
    const added = ladder.addLadderStage(base, "serve_return", { name: "Weapon serve" }, NOW)!;
    expect(added.stage).toBe("SR4");
  });
});

describe("benchmarks and focus next", () => {
  const pbResult = (test: string, value: number, measuredOn = "2026-10-20") => {
    const t = PICKLEBALL_TESTS.find((x) => x.test === test)!;
    return createBenchmark(me.id, { test, name: t.name, unit: t.unit, higherIsBetter: true, value, measuredOn, note: "" }, NOW);
  };

  it("pickleball tests are offered for pickleball only", () => {
    expect(availableTests([], "pickleball").map((t) => t.test)).toEqual(PICKLEBALL_TESTS.map((t) => t.test));
    expect(availableTests([], "tennis").some((t) => t.test.startsWith("pb_"))).toBe(false);
  });

  it("next level follows the rating: 4.5 below 4.5, then 5.0", () => {
    expect(nextLevel(null)).toBe(4.5);
    expect(nextLevel(4.11)).toBe(4.5);
    expect(nextLevel(4.5)).toBe(5);
  });

  it("focus next: biggest gap to the next level first, then tests not measured; reached targets drop out", () => {
    const results = [pbResult("pb_reset", 3), pbResult("pb_third_drop", 6), pbResult("pb_deep_return", 8), pbResult("pb_dink_rally", 26)];
    const items = focusNext(results, me.id, 4.5);
    // reset 3/6 (50% short), dink 26/30 (13%), third 6/7 (14%) — deep return 8/8 reached.
    expect(items.map((i) => i.test.test)).toEqual(["pb_reset", "pb_third_drop", "pb_dink_rally", "pb_deep_serve"]);
    expect(items[0]).toMatchObject({ target: 6, gap: 0.5 });
    expect(items.at(-1)).toMatchObject({ latest: null, gap: null });
    // At the 5.0 level the deep return target (9) isn't reached any more.
    expect(focusNext(results, me.id, 5).some((i) => i.test.test === "pb_deep_return")).toBe(true);
  });
});

describe("doubles, partners and how points were lost", () => {
  it("records per partner (names matched loosely), most matches first", () => {
    const list = [
      createMatch(me.id, doubles({ partner: "Jess" }), NOW),
      createMatch(me.id, doubles({ partner: " jess ", result: "loss" }), NOW),
      createMatch(me.id, doubles({ partner: "Wei", playedOn: "2026-10-25" }), NOW),
      createMatch(me.id, doubles({ format: "singles", partner: "" }), NOW),
    ];
    const r = partnerRecords(list);
    expect(r.map((p) => [p.name, p.played, p.wins, p.losses, p.winRate])).toEqual([
      ["Jess", 2, 1, 1, 50],
      ["Wei", 1, 1, 0, 100],
    ]);
  });

  it("adds up point-loss tallies, biggest first", () => {
    const list = [
      createMatch(me.id, doubles({ pointLosses: { reset: 5, speedup: 3 } }), NOW),
      createMatch(me.id, doubles({ pointLosses: { reset: 2, dink: 1 } }), NOW),
      createMatch(me.id, doubles({}), NOW),
    ];
    const s = pointLossSummary(list);
    expect(s.matches).toBe(2);
    expect(s.reasons.map((r) => [r.key, r.total])).toEqual([
      ["reset", 7],
      ["speedup", 3],
      ["dink", 1],
    ]);
  });
});

describe("kitchen arrival (KAP)", () => {
  it("KAP = thirds where you got to the kitchen ÷ all thirds, split by drop and drive", () => {
    // The worksheet example: 3 successes out of 7 thirds (drops 2/4, drives 1/3).
    const k = kapOf({ drop_ok: 2, drop_miss: 2, drive_ok: 1, drive_miss: 2, third_err: 1, fifth_err: 2 });
    expect([k.thirds, k.arrived, k.kap, k.dropKap, k.driveKap, k.drops, k.drives]).toEqual([7, 3, 43, 50, 33, 4, 3]);
    expect([k.thirdErrors, k.fifthErrors, k.seventhErrors, k.thirdErrorRate]).toEqual([1, 2, 0, 14]);
  });

  it("no tallies → no percentages (not 0%)", () => {
    const k = kapOf({});
    expect(k.thirds).toBe(0);
    expect(k.kap).toBeNull();
    expect(kapOf({ drop_ok: 3 }).driveKap).toBeNull();
  });

  it("adds tallies across matches and lists each match oldest first", () => {
    const list = [
      createMatch(me.id, doubles({ playedOn: "2026-10-25", kapStats: { drop_ok: 4, drop_miss: 1 } }), NOW),
      createMatch(me.id, doubles({ playedOn: "2026-10-10", kapStats: { drive_ok: 1, drive_miss: 4 } }), NOW),
      createMatch(me.id, doubles({ playedOn: "2026-10-12" }), NOW),
    ];
    const s = kapSummary(list);
    expect(s.matches).toBe(2);
    expect([s.overall.thirds, s.overall.kap, s.overall.dropKap, s.overall.driveKap]).toEqual([10, 50, 80, 20]);
    expect(s.perMatch.map((m) => [m.match.playedOn, m.kap])).toEqual([
      ["2026-10-10", 20],
      ["2026-10-25", 80],
    ]);
  });
});

describe("DUPR ratings", () => {
  it("history per kind, oldest first; edit, delete and restore", () => {
    let d = students.addRating(base, createRating(me.id, { kind: "doubles", rating: 4.1, ratedOn: "2026-10-01", note: "" }, NOW));
    d = students.addRating(d, createRating(me.id, { kind: "doubles", rating: 3.95, ratedOn: "2026-08-01", note: "" }, NOW));
    d = students.addRating(d, createRating(me.id, { kind: "singles", rating: 3.8, ratedOn: "2026-09-01", note: "" }, NOW));
    expect(ratingHistory(d.studentRatings, me.id, "doubles").map((r) => r.rating)).toEqual([3.95, 4.1]);
    const r = d.studentRatings[0];
    d = students.updateRating(d, r.id, { kind: "doubles", rating: 4.1234, ratedOn: "2026-10-01", note: " after league " }, NOW);
    expect(d.studentRatings[0]).toMatchObject({ rating: 4.123, note: "after league" });
    const gone = students.deleteRating(d, r.id);
    expect(students.restoreRating(gone, d.studentRatings[0]).studentRatings).toHaveLength(3);
    expect(formatRating(4.1)).toBe("4.10");
    expect(formatRating(4.123)).toBe("4.123");
  });

  it("there's one profile of your own, kept out of the coaching students", () => {
    expect(students.selfProfile(base, "pickleball")?.id).toBe(me.id);
    expect(students.selfProfile(base, "tennis")).toBeNull();
  });
});

describe("saved everywhere", () => {
  const sample = parseEnvelope({ schemaVersion: SCHEMA_VERSION, data: createSampleData("2026-11-04") })!.data;

  it("the sample has a pickleball profile with ratings, doubles matches and tallies", () => {
    const self = sample.students.find((s) => s.isSelf)!;
    expect(self.sport).toBe("pickleball");
    expect(sample.studentRatings.length).toBeGreaterThan(0);
    expect(sample.studentMatches.some((m) => m.format === "doubles" && m.partner && Object.keys(m.pointLosses).length)).toBe(true);
  });

  it("round-trips through the cloud rows (rating as text too) and the backup file", () => {
    expect(rowsToData(dataToRows(sample))).toEqual(sample);
    const rows = dataToRows(sample);
    for (const r of rows.student_ratings.values()) (r as unknown as { rating: unknown }).rating = String(r.rating);
    expect(rowsToData(rows).studentRatings).toEqual(sample.studentRatings);
    expect(parseEnvelope(JSON.parse(JSON.stringify(createEnvelope(sample))))!.data).toEqual(sample);
  });

  it("older (v8) data: students become tennis students, matches singles, no ratings", () => {
    const old = parseEnvelope({
      schemaVersion: 8,
      data: { students: [{ id: "s1", name: "Mia", createdAt: NOW }], studentMatches: [{ id: "m1", studentId: "s1", playedOn: "2026-10-01", result: "win", createdAt: NOW }] },
    })!.data;
    expect(old.students[0]).toMatchObject({ sport: "tennis", isSelf: false });
    expect(old.studentMatches[0]).toMatchObject({ format: "singles", partner: "", rated: false, pointLosses: {} });
    expect(old.studentRatings).toEqual([]);
  });

  it("bad tallies and ratings are cleaned up", () => {
    const m = createMatch(me.id, doubles({ pointLosses: { reset: 3, "Bad Key": 2, dink: -1, lob: 0 } as Record<string, number> }), NOW);
    const bad = createRating(me.id, { kind: "doubles", rating: 12, ratedOn: "2026-10-01", note: "" }, NOW);
    const parsed = parseEnvelope({ schemaVersion: SCHEMA_VERSION, data: { ...base, studentMatches: [m], studentRatings: [bad] } })!.data;
    expect(parsed.studentMatches[0].pointLosses).toEqual({ reset: 3 });
    expect(parsed.studentRatings).toHaveLength(0);
  });
});
