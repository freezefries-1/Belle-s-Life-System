import { describe, expect, it } from "vitest";

import { createSampleData } from "@/data/sample-data";
import { dataToRows, rowsToData } from "@/lib/repositories/mappers";
import { EMPTY_DATA, SCHEMA_VERSION, createEnvelope, parseEnvelope } from "@/lib/storage/schema";
import * as students from "@/lib/store/changes/students";
import {
  availableTests,
  benchmarkSeries,
  chartValue,
  createBenchmark,
  createMatch,
  customTestKey,
  formatBenchmark,
  matchRecord,
  matchesByMonth,
  matchesOf,
  percent,
} from "@/lib/students/performance";
import { createStudent } from "@/lib/students/student-model";
import type { PersistedData, StudentMatchInput } from "@/types";

import { local } from "./helpers";

const NOW = local("2026-11-02", 9);
const LATER = local("2026-11-02", 10);
const ethan = createStudent({ name: "Ethan", group: "junior" }, NOW);
const base: PersistedData = { ...EMPTY_DATA, students: [ethan] };

const matchInput = (over: Partial<StudentMatchInput> = {}): StudentMatchInput => ({
  playedOn: "2026-10-20",
  kind: "tournament",
  event: " STA Junior Tour ",
  opponent: "",
  result: "win",
  score: " 6-4 3-6 10-7 ",
  firstIn: 35,
  firstTotal: 58,
  secondIn: null,
  secondTotal: null,
  doubleFaults: 4,
  unforcedErrors: null,
  winners: null,
  notes: "",
  ...over,
});

describe("serve percentages are worked out for you", () => {
  it("rounds to a whole percentage, or nothing when it can't be worked out", () => {
    expect(percent(35, 58)).toBe(60);
    expect(percent(32, 50)).toBe(64);
    expect(percent(0, 10)).toBe(0);
    expect(percent(5, 0)).toBeNull();
    expect(percent(null, 50)).toBeNull();
    expect(percent(30, null)).toBeNull();
  });
});

describe("matches", () => {
  it("are saved tidy, listed newest first, and edited, deleted and restored", () => {
    const m = createMatch(ethan.id, matchInput(), NOW);
    expect(m).toMatchObject({ event: "STA Junior Tour", score: "6-4 3-6 10-7" });
    let d = students.addMatch(base, m);
    d = students.addMatch(d, createMatch(ethan.id, matchInput({ playedOn: "2026-10-28", result: "loss" }), NOW));
    expect(matchesOf(d.studentMatches, ethan.id).map((x) => x.playedOn)).toEqual(["2026-10-28", "2026-10-20"]);
    d = students.updateMatch(d, m.id, matchInput({ notes: " Great tiebreak " }), LATER);
    expect(d.studentMatches.find((x) => x.id === m.id)).toMatchObject({ notes: "Great tiebreak", updatedAt: LATER });
    const gone = students.deleteMatch(d, m.id);
    expect(gone.studentMatches).toHaveLength(1);
    expect(students.restoreMatch(gone, d.studentMatches.find((x) => x.id === m.id)!).studentMatches).toHaveLength(2);
    expect(students.addMatch(EMPTY_DATA, m)).toBe(EMPTY_DATA);
  });

  it("record, this year's record, win rate and recent form", () => {
    const list = [
      ["2025-12-01", "win"],
      ["2026-03-01", "loss"],
      ["2026-06-01", "win"],
      ["2026-08-01", "win"],
      ["2026-09-01", "loss"],
      ["2026-10-01", "win"],
    ].map(([playedOn, result]) => createMatch(ethan.id, matchInput({ playedOn, result: result as "win" | "loss" }), NOW));
    const r = matchRecord(list, "2026-11-02");
    expect(r.all).toEqual({ wins: 4, losses: 2, played: 6, winRate: 67 });
    expect(r.thisYear).toEqual({ wins: 3, losses: 2, played: 5, winRate: 60 });
    expect(r.form.map((m) => m.result)).toEqual(["loss", "win", "win", "loss", "win"]);
    expect(matchRecord([], "2026-11-02").all.winRate).toBeNull();
  });

  it("wins and losses by month for the chart, including empty months", () => {
    const list = [
      createMatch(ethan.id, matchInput({ playedOn: "2026-10-03" }), NOW),
      createMatch(ethan.id, matchInput({ playedOn: "2026-10-20", result: "loss" }), NOW),
      createMatch(ethan.id, matchInput({ playedOn: "2026-06-11" }), NOW),
      createMatch(ethan.id, matchInput({ playedOn: "2026-01-11" }), NOW), // outside the 6 months
    ];
    expect(matchesByMonth(list, "2026-11-02")).toEqual([
      { month: "2026-06", wins: 1, losses: 0 },
      { month: "2026-07", wins: 0, losses: 0 },
      { month: "2026-08", wins: 0, losses: 0 },
      { month: "2026-09", wins: 0, losses: 0 },
      { month: "2026-10", wins: 1, losses: 1 },
      { month: "2026-11", wins: 0, losses: 0 },
    ]);
  });
});

describe("benchmarks", () => {
  const rally = (value: number, measuredOn: string) =>
    createBenchmark(ethan.id, { test: "rally_baseline", name: "Rally, baseline (centre to centre)", unit: "balls", higherIsBetter: true, value, measuredOn, note: "" }, NOW);
  const spider = (value: number, measuredOn: string) =>
    createBenchmark(ethan.id, { test: customTestKey(" Spider  drill "), name: "Spider drill", unit: "seconds", higherIsBetter: false, value, measuredOn, note: "" }, NOW);

  it("formats results; 'out of 10' reads and charts as a percentage", () => {
    expect(formatBenchmark("out_of_10", 7)).toBe("7/10 (70%)");
    expect(formatBenchmark("balls", 1)).toBe("1 ball");
    expect(formatBenchmark("balls", 18)).toBe("18 balls");
    expect(formatBenchmark("seconds", 19.25)).toBe("19.3 s");
    expect(chartValue("out_of_10", 7)).toBe(70);
    expect(chartValue("balls", 18)).toBe(18);
  });

  it("groups results by test with latest, best and improvement (higher is better)", () => {
    const [s] = benchmarkSeries([rally(18, "2026-10-01"), rally(6, "2026-06-01"), rally(22, "2026-09-01")], ethan.id);
    expect(s.results.map((r) => r.value)).toEqual([6, 22, 18]);
    expect(s.latest.value).toBe(18);
    expect(s.best.value).toBe(22);
    expect(s.improvement).toBe(12);
  });

  it("for a timed test, lower is better", () => {
    const [s] = benchmarkSeries([spider(21.4, "2026-07-01"), spider(19.2, "2026-10-01")], ethan.id);
    expect(s.test).toBe("custom:spider drill");
    expect(s.best.value).toBe(19.2);
    expect(s.improvement).toBeCloseTo(2.2);
  });

  it("built-in tests come first, then yours; your tests appear in the picker", () => {
    const series = benchmarkSeries([spider(20, "2026-07-01"), rally(10, "2026-07-01")], ethan.id);
    expect(series.map((s) => s.name)).toEqual(["Rally, baseline (centre to centre)", "Spider drill"]);
    expect(availableTests([spider(20, "2026-07-01")]).at(-1)).toMatchObject({ name: "Spider drill", unit: "seconds", higherIsBetter: false });
    expect(availableTests([]).length).toBe(7);
  });

  it("deleting a student removes their matches and results; Undo restores them", () => {
    let d = students.addMatch(base, createMatch(ethan.id, matchInput(), NOW));
    d = students.addBenchmark(d, rally(10, "2026-10-01"));
    const result = students.deleteStudent(d, ethan.id)!;
    expect(result.data.studentMatches).toHaveLength(0);
    expect(result.data.studentBenchmarks).toHaveLength(0);
    const back = students.restoreStudent(result.data, result.removed);
    expect(back.studentMatches).toHaveLength(1);
    expect(back.studentBenchmarks).toHaveLength(1);
  });
});

describe("matches and benchmarks are saved everywhere", () => {
  const sample = parseEnvelope({ schemaVersion: SCHEMA_VERSION, data: createSampleData("2026-11-02") })!.data;

  it("the sample data has both", () => {
    expect(sample.studentMatches.length).toBeGreaterThan(0);
    expect(sample.studentBenchmarks.length).toBeGreaterThan(0);
  });

  it("round-trips through the cloud rows (numeric as text too) and the backup file", () => {
    expect(rowsToData(dataToRows(sample))).toEqual(sample);
    const rows = dataToRows(sample);
    for (const r of rows.student_benchmarks.values()) (r as unknown as { value: unknown }).value = String(r.value);
    expect(rowsToData(rows).studentBenchmarks).toEqual(sample.studentBenchmarks);
    expect(parseEnvelope(JSON.parse(JSON.stringify(createEnvelope(sample))))!.data).toEqual(sample);
  });

  it("a version 7 backup loads with none", () => {
    const old = parseEnvelope({ schemaVersion: 7, data: {} })!;
    expect(old.data.studentMatches).toEqual([]);
    expect(old.data.studentBenchmarks).toEqual([]);
  });

  it("impossible values are cleaned up", () => {
    const m = createMatch(ethan.id, matchInput({ firstIn: 70, firstTotal: 50 }), NOW);
    const bad = createBenchmark(ethan.id, { test: "first_serves", name: "First serves in", unit: "out_of_10", higherIsBetter: true, value: 14, measuredOn: "2026-10-01", note: "" }, NOW);
    const parsed = parseEnvelope({ schemaVersion: SCHEMA_VERSION, data: { ...base, studentMatches: [m], studentBenchmarks: [bad] } })!;
    expect(parsed.data.studentMatches[0]).toMatchObject({ firstIn: null, firstTotal: null, doubleFaults: 4 });
    expect(parsed.data.studentBenchmarks).toHaveLength(0);
  });
});
