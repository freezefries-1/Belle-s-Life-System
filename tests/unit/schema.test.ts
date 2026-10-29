import { describe, expect, it } from "vitest";

import { isValidISODate } from "@/lib/date";
import { EMPTY_DATA, SCHEMA_VERSION, parseEnvelope } from "@/lib/storage/schema";

import { local } from "./helpers";

const NOW = local("2026-10-12", 9);
const env = (data: object, schemaVersion = SCHEMA_VERSION) => parseEnvelope({ schemaVersion, savedAt: NOW, data: { ...EMPTY_DATA, ...data } })!;
const task = (id: string, extra: object = {}) => ({ id, title: id, status: "todo", createdAt: NOW, ...extra });

describe("dates", () => {
  it("rejects impossible dates", () => {
    for (const bad of ["2026-02-30", "2026-02-29", "2026-13-01", "2026-1-01", "", null]) expect(isValidISODate(bad)).toBe(false);
  });

  it("accepts real ones, including leap days", () => {
    for (const good of ["2028-02-29", "2026-12-31", "2026-01-01"]) expect(isValidISODate(good)).toBe(true);
  });

  it("clears an impossible stored due date but keeps the task", () => {
    expect(env({ tasks: [task("t", { dueDate: "2026-02-30" })] }).data.tasks[0].dueDate).toBeNull();
  });
});

describe("loading saved data", () => {
  it("skips unreadable records and counts them", () => {
    const p = env({ tasks: [task("ok"), { id: "bad", status: "weird" }] });
    expect(p.data.tasks.map((t) => t.id)).toEqual(["ok"]);
    expect(p.unreadable).toBe(1);
  });

  it("counts records removed by the clean-up rules", () => {
    const p = env({
      projects: [{ id: "p", name: "P", description: "", status: "active", createdAt: NOW, updatedAt: NOW }],
      milestones: [{ id: "m", projectId: "gone", title: "M", status: "upcoming", sortOrder: 1, createdAt: NOW, updatedAt: NOW }],
      commitmentCompletions: [{ id: "cc", commitmentId: "gone", dateKey: "2026-10-01", completedAt: NOW }],
      tasks: [task("t"), task("t")],
    });
    expect(p.removed).toEqual({ milestones: 1, completions: 1, priorities: 0, studentRecords: 0, duplicates: 1 });
    expect(p.dropped).toBe(3);
  });

  it("reports nothing for clean data", () => {
    expect(env({ tasks: [task("t")] }).dropped).toBe(0);
  });

  it("refuses data from a newer version of the app", () => {
    expect(parseEnvelope({ schemaVersion: SCHEMA_VERSION + 1, savedAt: NOW, data: {} })).toBeNull();
  });
});

describe("upgrading v4 → v5", () => {
  const v4 = {
    tasks: [task("t", { dueDate: "2026-10-09" })],
    sessions: [
      { id: "s", sprintId: "admin", taskIds: ["t"], plannedMinutes: 30, energyLevel: null, status: "ended", createdAt: NOW, startedAt: NOW, endedAt: NOW, accumulatedElapsedSeconds: 900, lastResumedAt: null, completedTaskIds: [] },
    ],
    commitments: [
      { id: "c", title: "Read", description: "", targetMinutes: null, frequency: "daily", selectedWeekdays: [], startDate: "2026-10-01", status: "paused", createdAt: NOW, updatedAt: local("2026-10-08", 9), archivedAt: null },
    ],
    projects: [{ id: "p", name: "P", description: "", status: "active", priority: null, category: "", startDate: null, targetDate: null, preparationDate: null, icon: "folder", colour: "blue", notes: "", createdAt: NOW, updatedAt: NOW, archivedAt: null }],
    milestones: [{ id: "m", projectId: "p", title: "M", description: "", targetDate: null, preparationDate: null, status: "completed", sortOrder: 0, createdAt: local("2026-10-01"), updatedAt: local("2026-10-06") }],
  };
  const p = parseEnvelope({ schemaVersion: 4, savedAt: NOW, data: v4 })!;

  it("adds empty weekly reviews", () => {
    expect(p.migratedFrom).toBe(4);
    expect(p.data.weeklyReviews).toEqual([]);
  });

  it("gives a paused commitment a pause starting at its last update", () => {
    expect(p.data.commitments[0].pausedPeriods).toEqual([{ from: "2026-10-08", to: null }]);
  });

  it("gives a completed milestone a completion date from its last update", () => {
    expect(p.data.milestones[0].completedAt).toBe(local("2026-10-06"));
  });

  it("is stable when parsed again", () => {
    expect(parseEnvelope({ schemaVersion: 5, savedAt: NOW, data: p.data })!.data).toEqual(p.data);
  });
});

describe("weekly reviews integrity", () => {
  const q = env({
    tasks: [task("open")],
    weeklyReviews: [
      { id: "r1", weekStartDate: "2026-10-05", status: "in_progress", createdAt: NOW, updatedAt: local("2026-10-06") },
      { id: "r2", weekStartDate: "2026-10-07", status: "completed", wentWell: "newer", createdAt: NOW, updatedAt: local("2026-10-09") },
    ],
    weeklyPriorities: [0, 1, 2, 3].map((i) => ({ id: `p${i}`, weeklyReviewId: "r2", taskId: i === 0 ? "open" : i === 1 ? "deleted" : null, projectId: null, title: `P${i}`, sortOrder: i, createdAt: NOW })),
  }).data;

  it("keeps one review per week (the latest), normalised to Monday", () => {
    expect(q.weeklyReviews.map((r) => [r.id, r.weekStartDate, r.weekEndDate])).toEqual([["r2", "2026-10-05", "2026-10-11"]]);
  });

  it("keeps at most three priorities, clearing links to deleted tasks but keeping titles", () => {
    expect(q.weeklyPriorities).toHaveLength(3);
    expect(q.weeklyPriorities.find((p) => p.id === "p1")).toMatchObject({ taskId: null, title: "P1" });
  });
});
