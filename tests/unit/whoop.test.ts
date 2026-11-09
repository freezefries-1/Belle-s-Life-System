import { describe, expect, it } from "vitest";

import { createSampleData } from "@/data/sample-data";
import { dataToRows, rowsToData } from "@/lib/repositories/mappers";
import { EMPTY_DATA, SCHEMA_VERSION, createEnvelope, parseEnvelope } from "@/lib/storage/schema";
import { average, dayOn, deleteWhoopDay, lastDays, parsePercent, restoreWhoopDay, setWhoopDay, zoneCounts, zoneOf } from "@/lib/whoop/whoop";
import type { PersistedData, WhoopDay } from "@/types";

const NOW = "2026-11-09T07:00:00.000Z";
const LATER = "2026-11-09T08:00:00.000Z";
const day = (date: string, recovery: number | null, sleep: number | null): WhoopDay => ({ id: date, date, recovery, sleep, createdAt: NOW, updatedAt: NOW });

describe("recovery and sleep", () => {
  it("WHOOP colours: green 67–100, yellow 34–66, red 0–33", () => {
    expect([100, 67, 66, 34, 33, 0].map(zoneOf)).toEqual(["green", "green", "yellow", "yellow", "red", "red"]);
  });

  it("reads typed percentages", () => {
    expect(parsePercent("72")).toBe(72);
    expect(parsePercent(" 72% ")).toBe(72);
    expect(parsePercent("")).toBeNull();
    expect(parsePercent("101")).toBeUndefined();
    expect(parsePercent("7.5")).toBeUndefined();
    expect(parsePercent("-3")).toBeUndefined();
  });

  it("averages and colour counts over the last days, skipping blanks", () => {
    const days = [day("2026-11-09", 80, 90), day("2026-11-08", 40, null), day("2026-11-05", 20, 70), day("2026-10-20", 99, 99)];
    const week = lastDays(days, "2026-11-09", 7);
    expect(week.map((d) => d.date)).toEqual(["2026-11-05", "2026-11-08", "2026-11-09"]);
    expect(average(week, "recovery")).toEqual({ value: 47, count: 3 });
    expect(average(week, "sleep")).toEqual({ value: 80, count: 2 });
    expect(zoneCounts(week)).toEqual({ green: 1, yellow: 1, red: 1 });
    expect(average([], "sleep")).toEqual({ value: null, count: 0 });
  });

  it("one entry per day: add, update the same day, delete and restore", () => {
    let d: PersistedData = { ...EMPTY_DATA };
    d = setWhoopDay(d, "2026-11-09", { recovery: 72, sleep: null }, NOW);
    d = setWhoopDay(d, "2026-11-09", { recovery: 72, sleep: 88 }, LATER);
    expect(d.whoopDays).toEqual([{ id: "2026-11-09", date: "2026-11-09", recovery: 72, sleep: 88, createdAt: NOW, updatedAt: LATER }]);
    expect(setWhoopDay(d, "2026-11-08", { recovery: null, sleep: null }, NOW)).toBe(d); // nothing to save
    const removed = dayOn(d.whoopDays, "2026-11-09")!;
    d = deleteWhoopDay(d, "2026-11-09");
    expect(d.whoopDays).toEqual([]);
    d = restoreWhoopDay(d, removed);
    expect(d.whoopDays).toEqual([removed]);
    // Undo doesn't overwrite a day entered again in the meantime.
    const again = setWhoopDay(deleteWhoopDay(d, "2026-11-09"), "2026-11-09", { recovery: 10, sleep: 10 }, LATER);
    expect(restoreWhoopDay(again, removed).whoopDays[0].recovery).toBe(10);
  });
});

describe("saved everywhere", () => {
  const sample = parseEnvelope({ schemaVersion: SCHEMA_VERSION, data: createSampleData("2026-11-09") })!.data;

  it("the sample has several weeks of days but not today", () => {
    expect(sample.whoopDays.length).toBeGreaterThan(30);
    expect(dayOn(sample.whoopDays, "2026-11-09")).toBeNull();
    expect(sample.whoopDays.every((d) => d.recovery! >= 0 && d.recovery! <= 100 && d.sleep! >= 0 && d.sleep! <= 100)).toBe(true);
  });

  it("round-trips through the cloud rows and the backup file", () => {
    expect(rowsToData(dataToRows(sample))).toEqual(sample);
    expect(parseEnvelope(JSON.parse(JSON.stringify(createEnvelope(sample))))!.data).toEqual(sample);
  });

  it("older (v10) data upgrades with no days; bad days are skipped; one per day", () => {
    expect(parseEnvelope({ schemaVersion: 10, data: {} })!.data.whoopDays).toEqual([]);
    const parsed = parseEnvelope({
      schemaVersion: SCHEMA_VERSION,
      data: {
        whoopDays: [
          { date: "2026-11-01", recovery: 70, sleep: 80, createdAt: NOW, updatedAt: NOW },
          { id: "x", date: "2026-11-01", recovery: 75, sleep: 85, createdAt: NOW, updatedAt: LATER }, // same day, newer
          { date: "2026-11-02", recovery: null, sleep: null, createdAt: NOW }, // nothing in it
          { date: "2026-11-03", recovery: 140, sleep: 50.5, createdAt: NOW }, // both invalid
          { date: "not a date", recovery: 50, createdAt: NOW },
        ],
      },
    })!;
    expect(parsed.data.whoopDays).toEqual([{ id: "2026-11-01", date: "2026-11-01", recovery: 75, sleep: 85, createdAt: NOW, updatedAt: LATER }]);
    expect(parsed.unreadable).toBe(3);
    expect(parsed.removed.duplicates).toBe(1);
  });
});
