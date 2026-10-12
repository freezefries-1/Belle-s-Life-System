import { createId } from "@/lib/id";
import { getConsistencyReport } from "@/lib/analytics/consistency";
import { getFocusStats, sessionsBetween } from "@/lib/analytics/time";
import { addDays, localDateOf } from "@/lib/date";
import { formatMinutes } from "@/lib/utils";
import type { ISODate, ISODateTime, SprintId, Task, WeeklyReview, Workspace } from "@/types";

export function createWeeklyReview(weekStartDate: ISODate, now: ISODateTime): WeeklyReview {
  return {
    id: createId(),
    weekStartDate,
    weekEndDate: addDays(weekStartDate, 6),
    status: "in_progress",
    wentWell: "",
    challenges: "",
    improvements: "",
    lessonsLearned: "",
    nextWeekFocus: "",
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };
}

export const REFLECTION_PROMPTS = [
  { key: "wentWell", label: "What went well this week?" },
  { key: "challenges", label: "What challenges did I face?" },
  { key: "improvements", label: "What could I improve next week?" },
  { key: "lessonsLearned", label: "What did I learn?" },
  { key: "nextWeekFocus", label: "What should I focus on next week?" },
] as const;

export const MAX_PRIORITIES = 3;

const inRange = (ts: string | null, from: ISODate, to: ISODate) => {
  if (!ts) return false;
  const d = localDateOf(ts);
  return d >= from && d <= to;
};

export const isTaskCompletedBetween = (t: Task, from: ISODate, to: ISODate) => t.status === "completed" && inRange(t.completedAt, from, to);

/**
 * Tasks due by the end of the week that were still open when it ended.
 *
 * Reconstructed from what's stored: when a task was created and when it was
 * completed. Due dates are today's values (earlier changes aren't recorded),
 * and skipped tasks are left out because skipping has no date.
 */
export function getUnfinishedAtWeekEnd(tasks: Task[], weekEnd: ISODate) {
  return tasks
    .filter((t) => {
      if (!t.dueDate || t.dueDate > weekEnd || t.status === "skipped") return false;
      if (localDateOf(t.createdAt) > weekEnd) return false;
      if (t.status === "completed") return !!t.completedAt && localDateOf(t.completedAt) > weekEnd;
      return true;
    })
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!));
}

export function getWeekSummary(ws: Workspace, weekStart: ISODate) {
  const weekEnd = addDays(weekStart, 6);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const completed = ws.tasks.filter((t) => isTaskCompletedBetween(t, weekStart, weekEnd));
  const created = ws.tasks.filter((t) => inRange(t.createdAt, weekStart, weekEnd));
  const unfinished = getUnfinishedAtWeekEnd(ws.tasks, weekEnd);
  const highlights = days.map((date) => {
    const h = ws.highlights.find((x) => x.dateKey === date) ?? null;
    const task = h ? (ws.tasks.find((t) => t.id === h.taskId) ?? null) : null;
    return { date, highlight: h, task, title: task?.title ?? h?.titleSnapshot ?? null, completed: task?.status === "completed" };
  });
  const commitments = getConsistencyReport(ws.commitments, weekStart, weekEnd, ws.today, ws.commitmentCompletions);
  const sessions = sessionsBetween(ws.sessions, weekStart, weekEnd);
  const focus = getFocusStats(sessions);
  const milestones = ws.milestones.filter((m) => m.status === "completed" && inRange(m.completedAt, weekStart, weekEnd));
  const bySprint = new Map<SprintId | null, number>();
  for (const t of completed) bySprint.set(t.sprint, (bySprint.get(t.sprint) ?? 0) + 1);

  return {
    weekStart,
    weekEnd,
    isPast: weekEnd < ws.today,
    isFuture: weekStart > ws.today,
    completed,
    created,
    unfinished,
    /** Still open now (can be acted on). */
    stillOpen: unfinished.filter((t) => t.status === "todo" || t.status === "in_progress"),
    highlights,
    highlightsSet: highlights.filter((h) => h.highlight).length,
    highlightsCompleted: highlights.filter((h) => h.completed).length,
    commitments,
    sessions,
    focus,
    milestones,
    bySprint,
  };
}

export type WeekSummary = ReturnType<typeof getWeekSummary>;

/** Short, factual sentences built only from records. No judgements. */
export function getWeeklyInsights(summary: WeekSummary, sprintLabel: (id: SprintId) => string): string[] {
  const out: string[] = [];
  const n = summary.completed.length;
  if (n > 0) out.push(`You completed ${n} ${n === 1 ? "task" : "tasks"} this week.`);

  const sprints = [...summary.bySprint.entries()].filter((e): e is [SprintId, number] => e[0] !== null).sort((a, b) => b[1] - a[1]);
  if (n >= 3 && sprints.length && (sprints.length === 1 || sprints[0][1] > sprints[1][1])) {
    out.push(`${sprintLabel(sprints[0][0])} accounted for most completed tasks (${sprints[0][1]} of ${n}).`);
  }
  if (summary.highlightsSet > 0) {
    out.push(`You completed ${summary.highlightsCompleted} of ${summary.highlightsSet} Daily ${summary.highlightsSet === 1 ? "Highlight" : "Highlights"}.`);
  }
  const best = [...summary.commitments.rows].sort((a, b) => b.done - a.done)[0];
  if (best && best.done > 0) {
    out.push(`You completed ${best.done} of ${best.scheduled} scheduled “${best.commitment.title}” ${best.scheduled === 1 ? "commitment" : "commitments"}.`);
  }
  if (summary.focus.totalMinutes > 0) {
    out.push(
      `You recorded ${formatMinutes(summary.focus.totalMinutes)} of focused work across ${summary.focus.count} ${summary.focus.count === 1 ? "session" : "sessions"}.`,
    );
  }
  if (summary.milestones.length) {
    out.push(`You reached ${summary.milestones.length === 1 ? "a milestone" : `${summary.milestones.length} milestones`}: ${summary.milestones.map((m) => m.title).join(", ")}.`);
  }
  return out;
}

/** The week to open by default: this week from Friday on, otherwise last week. */
export function defaultReviewWeek(today: ISODate, startOfWeek: (d: ISODate) => ISODate) {
  const day = new Date(`${today}T12:00:00`).getDay();
  const thisWeek = startOfWeek(today);
  return day === 0 || day >= 5 ? thisWeek : addDays(thisWeek, -7);
}
