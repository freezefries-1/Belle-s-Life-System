import { describe, expect, it } from "vitest";

import { getCompletionTrend } from "@/lib/analytics/progress";
import { getEstimationInsights, getEstimationStats, getFocusStats, getTimeRecords, sessionsBetween } from "@/lib/analytics/time";
import { startOfWeek } from "@/lib/date";
import { defaultReviewWeek, getUnfinishedAtWeekEnd, getWeekSummary } from "@/lib/review/weekly";
import { createSession } from "@/lib/sessions/session-model";
import { EMPTY_DATA } from "@/lib/storage/schema";
import { createTask } from "@/lib/tasks/task-model";
import type { Task, Workspace } from "@/types";

import { local } from "./helpers";

const NOW = local("2026-10-12", 9);
const TODAY = "2026-10-12"; // a Monday
const t = (id: string, extra: Partial<Task>): Task => ({ ...createTask({ title: id }, local("2026-10-01")), id, ...extra });
const ids = (xs: Task[]) => xs.map((x) => x.id).sort();

const tasks: Task[] = [
  t("sunLate", { status: "completed", completedAt: local("2026-10-11", 23, 30) }),
  t("monEarly", { status: "completed", completedAt: local("2026-10-12", 0, 10) }),
  t("sunEarlyPrevWeek", { status: "completed", completedAt: local("2026-10-04", 23, 59) }),
  t("openDue", { dueDate: "2026-10-09" }),
  t("laterDone", { dueDate: "2026-10-08", status: "completed", completedAt: local("2026-10-12", 9) }),
  t("createdAfter", { dueDate: "2026-10-09", createdAt: local("2026-10-12", 8) }),
  t("skipped", { dueDate: "2026-10-09", status: "skipped" }),
  t("dueNextWeek", { dueDate: "2026-10-13" }),
  t("doneInWeek", { dueDate: "2026-10-07", status: "completed", completedAt: local("2026-10-07", 10) }),
];

describe("weekly review", () => {
  const summary = getWeekSummary({ ...EMPTY_DATA, tasks, today: TODAY } as Workspace, "2026-10-05");

  it("uses local Monday–Sunday boundaries for completed tasks", () => {
    expect(ids(summary.completed)).toEqual(["doneInWeek", "sunLate"]);
  });

  it("lists tasks unfinished at week end: still open, or finished later", () => {
    expect(ids(getUnfinishedAtWeekEnd(tasks, "2026-10-11"))).toEqual(["laterDone", "openDue"]);
    expect(ids(summary.stillOpen)).toEqual(["openDue"]);
    expect(summary.isPast).toBe(true);
  });

  it("defaults to last week early in the week, this week from Saturday", () => {
    expect(defaultReviewWeek(TODAY, startOfWeek)).toBe("2026-10-05");
    expect(defaultReviewWeek("2026-10-17", startOfWeek)).toBe("2026-10-12");
  });
});

describe("time estimation", () => {
  const est = (id: string, e: number | null, a: number | null, sprint: Task["sprint"] = "admin") =>
    t(id, { status: "completed", completedAt: local("2026-10-10"), estimatedMinutes: e, actualMinutes: a, sprint });
  const records = getTimeRecords([est("a", 15, 40), est("b", 30, 25), est("c", 20, 30), est("d", 10, null), est("e", null, 12), t("open", { estimatedMinutes: 5, actualMinutes: 9 })]);
  const stats = getEstimationStats(records);

  it("compares only tasks with both an estimate and an actual time", () => {
    expect(stats.count).toBe(3);
    expect([stats.estimateOnly, stats.actualOnly]).toEqual([1, 1]);
    expect(records.some((r) => r.task.id === "open")).toBe(false);
  });

  it("calculates average, median and share over", () => {
    expect([stats.averageDifference, stats.medianDifference, stats.percentOver, stats.overCount]).toEqual([10, 10, 67, 2]);
    expect(records.find((r) => r.task.id === "b")!.difference).toBe(-5);
  });

  it("only shows patterns with enough records", () => {
    expect(getEstimationInsights(records, (s) => s)).toEqual([]);
    const many = getTimeRecords([est("1", 10, 20), est("2", 10, 15), est("3", 20, 30), est("4", 30, 40), est("5", 15, 25), est("6", 60, 58, "build")]);
    const insights = getEstimationInsights(many, (s) => s);
    expect(insights.some((i) => i.includes("underestimate admin"))).toBe(true);
    expect(insights.some((i) => i.includes("build"))).toBe(false);
  });
});

describe("focus sessions and trends", () => {
  const s1 = { ...createSession({ sprintId: "build", taskIds: [], plannedMinutes: 60, energyLevel: null }, NOW), status: "ended" as const, endedAt: local("2026-10-10", 11), accumulatedElapsedSeconds: 70 * 60 };
  const s2 = { ...s1, id: "s2", sprintId: "admin" as const, endedAt: local("2026-10-12", 10), accumulatedElapsedSeconds: 30 * 60 };
  const running = { ...s1, id: "s3", status: "running" as const, endedAt: null };

  it("uses ended sessions in range and their actual time", () => {
    expect(getFocusStats(sessionsBetween([s1, s2, running], "2026-10-05", "2026-10-11"))).toMatchObject({ count: 1, totalMinutes: 70, plannedMinutes: 60 });
    expect(getFocusStats([s1, s2]).averageMinutes).toBe(50);
  });

  it("buckets completions by week or day", () => {
    expect(getCompletionTrend(tasks, "2026-10-05", "2026-10-18", "week").map((b) => b.count)).toEqual([2, 2]);
    expect(getCompletionTrend(tasks, "2026-10-05", "2026-10-11", "day")).toHaveLength(7);
  });
});
