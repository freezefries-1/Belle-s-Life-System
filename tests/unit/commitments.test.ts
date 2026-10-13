import { describe, expect, it } from "vitest";

import { getConsistency, wasActiveOn } from "@/lib/analytics/consistency";
import { createCommitment, getRecentHistory, getStreak } from "@/lib/daily/commitments";
import { commitmentsForDay } from "@/lib/daily/day";
import type { CommitmentCompletion, MicroCommitment } from "@/types";

import { days, local } from "./helpers";

const NOW = local("2026-10-12", 9);
const TODAY = "2026-10-12"; // a Monday

const commitment = (o: Partial<MicroCommitment> = {}): MicroCommitment => ({
  ...createCommitment({ title: "Read", frequency: "daily", startDate: "2026-10-01" }, "2026-10-01", NOW),
  id: "c",
  ...o,
});
const ticks = (dates: string[], id = "c"): CommitmentCompletion[] =>
  dates.map((d, i) => ({ id: `${id}${i}`, commitmentId: id, dateKey: d, completedAt: local(d, 20) }));

describe("consistency", () => {
  const daily = commitment();

  it("counts each scheduled day", () => {
    const r = getConsistency(daily, "2026-10-05", "2026-10-11", TODAY, ticks(["2026-10-05", "2026-10-06", "2026-10-08"]));
    expect(r).toEqual({ scheduled: 7, done: 3, percent: 43 });
  });

  it("only counts the selected weekdays", () => {
    const mwf = commitment({ frequency: "weekdays", selectedWeekdays: [1, 3, 5] });
    const r = getConsistency(mwf, "2026-10-05", "2026-10-11", TODAY, ticks(["2026-10-05", "2026-10-07"]));
    expect([r.scheduled, r.done]).toEqual([3, 2]);
  });

  it("leaves out paused days, and the pause ends on its end date", () => {
    const paused = commitment({ pausedPeriods: [{ from: "2026-10-08", to: "2026-10-10" }] });
    expect(getConsistency(paused, "2026-10-05", "2026-10-11", TODAY, ticks(["2026-10-05"])).scheduled).toBe(5);
    expect(wasActiveOn(paused, "2026-10-10")).toBe(true);
    expect(wasActiveOn(paused, "2026-10-09")).toBe(false);
  });

  it("only counts days before archiving", () => {
    const archived = commitment({ status: "archived", archivedAt: local("2026-10-09", 10) });
    expect(getConsistency(archived, "2026-10-05", "2026-10-11", TODAY, []).scheduled).toBe(4);
  });

  it("treats today as open until it's done", () => {
    expect(getConsistency(daily, TODAY, TODAY, TODAY, [])).toMatchObject({ scheduled: 0, percent: null });
    expect(getConsistency(daily, TODAY, TODAY, TODAY, ticks([TODAY]))).toMatchObject({ scheduled: 1, done: 1 });
  });

  it("never counts days before the start date", () => {
    expect(getConsistency(daily, "2026-09-25", "2026-09-30", TODAY, []).scheduled).toBe(0);
  });

  describe("weekly commitments", () => {
    const weekly = commitment({ frequency: "weekly", startDate: "2026-09-01" });

    it("count one opportunity per week", () => {
      const r = getConsistency(weekly, "2026-09-21", "2026-10-11", TODAY, ticks(["2026-09-23", "2026-10-09"]));
      expect([r.scheduled, r.done]).toEqual([3, 2]);
    });

    it("don't count the current, still-open week", () => {
      expect(getConsistency(weekly, "2026-10-12", "2026-10-18", TODAY, []).scheduled).toBe(0);
    });

    it("ignore a tick just outside the selected range", () => {
      expect(getConsistency(weekly, "2026-10-01", "2026-10-03", TODAY, ticks(["2026-09-29"]))).toMatchObject({ scheduled: 0, done: 0 });
    });

    it("count a tick inside the range", () => {
      expect(getConsistency(weekly, "2026-10-01", "2026-10-03", TODAY, ticks(["2026-10-02"]))).toMatchObject({ scheduled: 1, done: 1 });
    });

    it("count closed, unticked weeks as missed", () => {
      expect(getConsistency(weekly, "2026-10-01", "2026-10-11", TODAY, [])).toMatchObject({ scheduled: 2, done: 0 });
    });
  });
});

describe("streaks and history dots", () => {
  // Daily from 1 Oct, paused 5–9 Oct, ticked on every active day.
  const paused = commitment({ pausedPeriods: [{ from: "2026-10-05", to: "2026-10-10" }] });
  const pausedTicks = ticks([...days("2026-10-01", "2026-10-04"), ...days("2026-10-10", "2026-10-12")]);

  it("skip paused days", () => {
    expect(getStreak(paused, TODAY, pausedTicks).count).toBe(7);
  });

  it("show paused days as off, matching the consistency figure", () => {
    const history = getRecentHistory(paused, TODAY, pausedTicks, 14);
    expect(history.cells.map((c) => c.state[0]).join("")).toBe("ooddddoooooddd");
    const consistency = getConsistency(paused, "2026-09-29", TODAY, TODAY, pausedTicks);
    expect([history.done, history.scheduled]).toEqual([consistency.done, consistency.scheduled]);
  });

  it("still break on a real miss", () => {
    expect(getStreak(commitment(), TODAY, ticks([TODAY, "2026-10-10"])).count).toBe(1);
  });

  it("are kept while a commitment is paused", () => {
    const nowPaused = commitment({ status: "paused", pausedPeriods: [{ from: "2026-10-08", to: null }] });
    expect(getStreak(nowPaused, TODAY, ticks(days("2026-10-01", "2026-10-07"))).count).toBe(7);
  });

  it("skip a paused week for weekly commitments", () => {
    const weekly = commitment({ frequency: "weekly", startDate: "2026-09-14", pausedPeriods: [{ from: "2026-09-28", to: "2026-10-05" }] });
    expect(getStreak(weekly, TODAY, ticks(["2026-09-15", "2026-09-22", "2026-10-07", TODAY])).count).toBe(4);
  });
});

describe("commitments listed for a past day (Kaizen Log)", () => {
  const paused = commitment({ pausedPeriods: [{ from: "2026-10-05", to: "2026-10-10" }] });

  it("hide a commitment on a day it was paused", () => {
    expect(commitmentsForDay({ commitments: [paused], commitmentCompletions: [] }, "2026-10-07", TODAY)).toHaveLength(0);
    expect(commitmentsForDay({ commitments: [paused], commitmentCompletions: [] }, "2026-10-03", TODAY)).toHaveLength(1);
  });

  it("show an archived commitment before archiving, not after", () => {
    const archived = commitment({ status: "archived", archivedAt: local("2026-10-08") });
    const ws = { commitments: [archived], commitmentCompletions: [] };
    expect(commitmentsForDay(ws, "2026-10-07", TODAY)).toHaveLength(1);
    expect(commitmentsForDay(ws, "2026-10-09", TODAY)).toHaveLength(0);
  });
});
