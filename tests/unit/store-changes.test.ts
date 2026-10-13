import { describe, expect, it } from "vitest";

import { createCapture } from "@/lib/brain-dump/capture-model";
import { createCommitment } from "@/lib/daily/commitments";
import { createMilestone, createProject } from "@/lib/projects/project-model";
import { createTemplate, generateOccurrences } from "@/lib/recurrence/recurrence";
import { createSession } from "@/lib/sessions/session-model";
import { EMPTY_DATA } from "@/lib/storage/schema";
import * as daily from "@/lib/store/changes/daily";
import * as projects from "@/lib/store/changes/projects";
import * as recurrence from "@/lib/store/changes/recurrence";
import * as reviews from "@/lib/store/changes/reviews";
import * as tasks from "@/lib/store/changes/tasks";
import type { PersistedData } from "@/types";

import { local } from "./helpers";

const NOW = local("2026-10-12", 9);
const LATER = local("2026-10-12", 10);
const TODAY = "2026-10-12";
const empty: PersistedData = EMPTY_DATA;

describe("Brain Dump", () => {
  it("converts an entry once, linking both sides", () => {
    const capture = createCapture({ title: "Idea" }, NOW);
    const d = tasks.addCapture(empty, capture);
    const first = tasks.convertCapture(d, capture.id, { title: "Idea" }, LATER)!;
    expect(first.task.sourceCaptureId).toBe(capture.id);
    expect(first.data.captures[0]).toMatchObject({ status: "converted", convertedTaskId: first.task.id });
    expect(tasks.convertCapture(first.data, capture.id, { title: "Idea" }, LATER)).toBeNull();
  });
});

describe("tasks", () => {
  const project = createProject({ name: "P" }, NOW);
  const other = createProject({ name: "Q" }, NOW);
  const milestone = createMilestone(project.id, { title: "M" }, 1000, NOW);
  const base = { ...empty, projects: [project, other], milestones: [milestone] };
  const task = { ...tasks.newTask(base, { title: "Write", projectId: project.id }, NOW), milestoneId: milestone.id };
  const withTask = daily.setHighlight(tasks.addTask(base, task), task.id, TODAY, NOW)!.data;

  it("renaming updates the highlight's saved title", () => {
    expect(tasks.updateTask(withTask, task.id, { title: "Write more" }, LATER).highlights[0].titleSnapshot).toBe("Write more");
  });

  it("moving to another project clears a milestone from the old one", () => {
    expect(tasks.updateTask(withTask, task.id, { projectId: other.id }, LATER).tasks[0].milestoneId).toBeNull();
  });

  it("completing and reopening sets and clears the completion time", () => {
    const done = tasks.toggleTaskComplete(withTask, task.id, LATER);
    expect(done.tasks[0]).toMatchObject({ status: "completed", completedAt: LATER });
    expect(tasks.toggleTaskComplete(done, task.id, LATER).tasks[0]).toMatchObject({ status: "todo", completedAt: null });
  });

  it("deleting a project keeps its tasks, just unlinked, and removes its milestones", () => {
    const d = projects.deleteProject(withTask, project.id, LATER);
    expect(d.tasks[0]).toMatchObject({ id: task.id, projectId: null, milestoneId: null });
    expect(d.milestones).toEqual([]);
  });

  it("deleting a milestone keeps its tasks", () => {
    expect(projects.deleteMilestone(withTask, milestone.id).tasks[0]).toMatchObject({ id: task.id, projectId: project.id, milestoneId: null });
  });

  it("board reordering alone isn't an edit; changing sprint is", () => {
    const moved = tasks.applyBoardOrder(withTask, [{ id: task.id, sprint: task.sprint, sortOrder: 5 }], LATER);
    expect(moved.tasks[0].updatedAt).toBe(task.updatedAt);
    expect(tasks.applyBoardOrder(withTask, [{ id: task.id, sprint: "build", sortOrder: 5 }], LATER).tasks[0].updatedAt).toBe(LATER);
  });
});

describe("micro-commitments", () => {
  const c = createCommitment({ title: "Read" }, "2026-10-01", NOW);
  const d = daily.addCommitment(empty, c);

  it("pausing and resuming records the paused stretch", () => {
    const paused = daily.setCommitmentStatus(d, c.id, "paused", "2026-10-05", NOW);
    const resumed = daily.setCommitmentStatus(paused, c.id, "active", "2026-10-09", LATER);
    expect(resumed.commitments[0].pausedPeriods).toEqual([{ from: "2026-10-05", to: "2026-10-09" }]);
  });

  it("ticking twice removes the tick; never duplicates", () => {
    const once = daily.toggleCommitmentDone(d, c.id, TODAY, NOW);
    expect(once.done).toBe(true);
    const twice = daily.toggleCommitmentDone(once.data, c.id, TODAY, NOW);
    expect(twice.done).toBe(false);
    expect(twice.data.commitmentCompletions).toEqual([]);
  });

  it("deleting removes its history too", () => {
    expect(daily.deleteCommitment(daily.toggleCommitmentDone(d, c.id, TODAY, NOW).data, c.id).commitmentCompletions).toEqual([]);
  });
});

describe("recurring series", () => {
  const template = createTemplate({ title: "Stretch", frequency: "daily", interval: 1, intervalUnit: "days", selectedWeekdays: [], startDate: TODAY, endDate: null }, NOW, TODAY);
  const started = recurrence.addRecurrence(empty, template, TODAY, NOW);
  const withDone = { ...started, tasks: started.tasks.map((t) => (t.occurrenceDate === TODAY ? { ...t, status: "completed" as const, completedAt: NOW } : t)) };

  it("a schedule change replaces only upcoming unfinished occurrences", () => {
    const d = recurrence.updateRecurrence(withDone, template.id, { frequency: "weekly", selectedWeekdays: [3] }, TODAY, LATER);
    const dates = d.tasks.map((t) => t.occurrenceDate).sort();
    expect(dates).toEqual([TODAY, "2026-10-14", "2026-10-21"]);
    expect(d.tasks.find((t) => t.occurrenceDate === TODAY)!.status).toBe("completed");
  });

  it("a title change updates upcoming occurrences but not completed ones", () => {
    const d = recurrence.updateRecurrence(withDone, template.id, { title: "Stretch well" }, TODAY, LATER);
    expect(d.tasks.find((t) => t.occurrenceDate === TODAY)!.title).toBe("Stretch");
    expect(d.tasks.filter((t) => t.occurrenceDate! > TODAY).every((t) => t.title === "Stretch well")).toBe(true);
  });

  it("deleting keeps completed occurrences as ordinary tasks, and can remove upcoming ones", () => {
    const d = recurrence.deleteRecurrence(withDone, template.id, { removeFuture: true }, TODAY);
    expect(d.recurrences).toEqual([]);
    expect(d.tasks).toHaveLength(1);
    expect(d.tasks[0]).toMatchObject({ status: "completed", recurrenceTemplateId: null });
  });

  it("resuming after a pause doesn't back-fill the gap", () => {
    const pausedSinceOct1 = { ...empty, recurrences: [{ ...template, startDate: "2026-09-01", generatedThrough: "2026-10-01" }] };
    const paused = recurrence.setRecurrenceStatus(pausedSinceOct1, template.id, "paused", undefined, TODAY, NOW);
    const resumed = recurrence.setRecurrenceStatus(paused, template.id, "active", undefined, TODAY, LATER);
    expect(resumed.tasks.every((t) => t.occurrenceDate! >= TODAY)).toBe(true);
    expect(generateOccurrences(resumed, TODAY, LATER)).toBe(resumed);
  });
});

describe("weekly review and session time", () => {
  it("keeps at most three priorities and replaces them on save", () => {
    const items = ["A", "B", "C", "D"].map((title) => ({ title, taskId: null, projectId: null }));
    const once = reviews.setWeeklyPriorities(empty, "2026-10-12", items, NOW);
    expect(once.weeklyPriorities.map((p) => p.title)).toEqual(["A", "B", "C"]);
    const again = reviews.setWeeklyPriorities(once, "2026-10-12", [{ title: "Only", taskId: null, projectId: null }], LATER);
    expect(again.weeklyReviews).toHaveLength(1);
    expect(again.weeklyPriorities.map((p) => p.title)).toEqual(["Only"]);
  });

  it("gives session minutes to tasks, never more than the session ran, and re-allocation adjusts", () => {
    const task = tasks.newTask(empty, { title: "T", estimatedMinutes: 20 }, NOW);
    const session = { ...createSession({ sprintId: "admin", taskIds: [task.id], plannedMinutes: 30, energyLevel: null }, NOW), status: "ended" as const, endedAt: LATER, accumulatedElapsedSeconds: 30 * 60 };
    const d = { ...tasks.addTask(empty, task), sessions: [session] };
    expect(reviews.allocateSessionTime(d, session.id, [{ taskId: task.id, minutes: 31 }], LATER)).toBeNull();
    const given = reviews.allocateSessionTime(d, session.id, [{ taskId: task.id, minutes: 25 }], LATER)!;
    expect(given.tasks[0].actualMinutes).toBe(25);
    expect(reviews.allocateSessionTime(given, session.id, [{ taskId: task.id, minutes: 10 }], LATER)!.tasks[0].actualMinutes).toBe(10);
  });
});
