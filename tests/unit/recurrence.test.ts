import { describe, expect, it } from "vitest";

import { createTemplate, generateOccurrences, occurrenceId, occursOn } from "@/lib/recurrence/recurrence";
import { EMPTY_DATA } from "@/lib/storage/schema";
import type { PersistedData, RecurrenceInput, RecurrenceTemplate, Task } from "@/types";

import { local } from "./helpers";

const NOW = local("2026-10-12", 9);
const TODAY = "2026-10-12"; // a Monday
const rule = (o: Partial<RecurrenceInput> = {}): RecurrenceInput => ({
  title: "Stretch",
  frequency: "daily",
  interval: 1,
  intervalUnit: "days",
  selectedWeekdays: [],
  startDate: TODAY,
  endDate: null,
  ...o,
});
const data = (recurrences: RecurrenceTemplate[], tasks: Task[] = []): PersistedData => ({ ...EMPTY_DATA, tasks, recurrences });
const dates = (d: PersistedData) => d.tasks.map((t) => t.occurrenceDate).sort();

describe("which dates a rule fires on", () => {
  it("monthly on the 31st falls on the last day of shorter months", () => {
    const monthly = createTemplate(rule({ frequency: "monthly", startDate: "2026-01-31" }), NOW);
    expect(occursOn(monthly, "2026-02-28")).toBe(true);
    expect(occursOn(monthly, "2026-04-30")).toBe(true);
    expect(occursOn(monthly, "2026-04-29")).toBe(false);
  });

  it("every two weeks skips the weeks in between", () => {
    const biweekly = createTemplate(rule({ frequency: "biweekly", selectedWeekdays: [1] }), NOW);
    expect(occursOn(biweekly, "2026-10-12")).toBe(true);
    expect(occursOn(biweekly, "2026-10-19")).toBe(false);
    expect(occursOn(biweekly, "2026-10-26")).toBe(true);
  });
});

describe("generating occurrences", () => {
  it("creates today's plus up to four upcoming", () => {
    const g = generateOccurrences(data([createTemplate(rule(), NOW, TODAY)]), TODAY, NOW);
    expect(dates(g)).toEqual(["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16"]);
  });

  it("is idempotent", () => {
    const once = generateOccurrences(data([createTemplate(rule(), NOW, TODAY)]), TODAY, NOW);
    expect(generateOccurrences(once, TODAY, NOW)).toBe(once);
  });

  it("doesn't let a skipped occurrence use up an upcoming slot", () => {
    const g = generateOccurrences(data([createTemplate(rule(), NOW, TODAY)]), TODAY, NOW);
    const skipped = { ...g, tasks: g.tasks.map((t) => (t.occurrenceDate === "2026-10-13" ? { ...t, status: "skipped" as const } : t)) };
    const again = generateOccurrences(skipped, TODAY, NOW);
    expect(again.tasks.filter((t) => t.occurrenceDate! > TODAY && t.status === "todo")).toHaveLength(4);
  });

  it("after more than a year away, creates only yesterday's missed occurrence", () => {
    const old = { ...createTemplate(rule({ startDate: "2024-01-01" }), NOW), generatedThrough: "2024-06-01" };
    const g = generateOccurrences(data([old]), TODAY, NOW);
    const missed = g.tasks.filter((t) => t.occurrenceDate! < TODAY);
    expect(missed.map((t) => t.id)).toEqual([occurrenceId(old.id, "2026-10-11")]);
  });

  it("a new series with a past start date starts today, with nothing overdue", () => {
    const weekly = createTemplate(rule({ frequency: "weekly", selectedWeekdays: [2], startDate: "2026-09-01" }), NOW, TODAY);
    const g = generateOccurrences(data([weekly]), TODAY, NOW);
    expect(dates(g)).toEqual(["2026-10-13", "2026-10-20"]);
    const daily = createTemplate(rule({ startDate: "2026-10-01" }), NOW, TODAY);
    expect(dates(generateOccurrences(data([daily]), TODAY, NOW))[0]).toBe(TODAY);
  });

  it("never brings back a deleted occurrence", () => {
    const g = generateOccurrences(data([createTemplate(rule(), NOW, TODAY)]), TODAY, NOW);
    const deleted = { ...g, tasks: g.tasks.filter((t) => t.occurrenceDate !== TODAY) };
    expect(dates(generateOccurrences(deleted, TODAY, NOW))).not.toContain(TODAY);
  });
});
