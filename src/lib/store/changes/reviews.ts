import { createId } from "@/lib/id";
import { MAX_PRIORITIES, createWeeklyReview } from "@/lib/review/weekly";
import type { ISODate, ISODateTime, PersistedData, SessionAllocation, WeeklyPriority, WeeklyReview, WeeklyReviewInput, WeeklyReviewStatus } from "@/types";

/** Weekly reviews (keyed by the week's Monday; created on first save) and session time. */

function withReview(d: PersistedData, weekStart: ISODate, now: ISODateTime, change: (r: WeeklyReview) => WeeklyReview): PersistedData {
  const existing = d.weeklyReviews.find((r) => r.weekStartDate === weekStart);
  const updated = change(existing ?? createWeeklyReview(weekStart, now));
  return {
    ...d,
    weeklyReviews: existing ? d.weeklyReviews.map((r) => (r.id === existing.id ? updated : r)) : [...d.weeklyReviews, updated],
  };
}

export const updateWeeklyReview = (d: PersistedData, weekStart: ISODate, changes: WeeklyReviewInput, now: ISODateTime) =>
  withReview(d, weekStart, now, (r) => ({ ...r, ...changes, updatedAt: now }));

export const setWeeklyReviewStatus = (d: PersistedData, weekStart: ISODate, status: WeeklyReviewStatus, now: ISODateTime) =>
  withReview(d, weekStart, now, (r) => ({ ...r, status, completedAt: status === "completed" ? now : null, updatedAt: now }));

/** Replaces the week's priorities (max three, in order). */
export function setWeeklyPriorities(
  d: PersistedData,
  weekStart: ISODate,
  items: Pick<WeeklyPriority, "taskId" | "projectId" | "title">[],
  now: ISODateTime,
): PersistedData {
  const next = withReview(d, weekStart, now, (r) => ({ ...r, updatedAt: now }));
  const id = next.weeklyReviews.find((r) => r.weekStartDate === weekStart)!.id;
  const priorities: WeeklyPriority[] = items
    .filter((i) => i.title.trim())
    .slice(0, MAX_PRIORITIES)
    .map((i, index) => ({ id: createId(), weeklyReviewId: id, taskId: i.taskId, projectId: i.projectId, title: i.title.trim(), sortOrder: index, createdAt: now }));
  return { ...next, weeklyPriorities: [...d.weeklyPriorities.filter((p) => p.weeklyReviewId !== id), ...priorities] };
}

/**
 * Give a finished session's minutes to its tasks (adding to, or taking back
 * from, their actual time). Returns null if the session isn't finished or
 * more time is given away than it actually ran.
 */
export function allocateSessionTime(d: PersistedData, sessionId: string, allocations: SessionAllocation[], now: ISODateTime): PersistedData | null {
  const session = d.sessions.find((s) => s.id === sessionId);
  if (!session || session.status !== "ended") return null;
  const clean = allocations
    .map((a) => ({ taskId: a.taskId, minutes: Math.max(0, Math.round(a.minutes)) }))
    .filter((a) => a.minutes > 0 && d.tasks.some((t) => t.id === a.taskId));
  const total = clean.reduce((s, a) => s + a.minutes, 0);
  if (total > Math.round(session.accumulatedElapsedSeconds / 60)) return null;
  const before = new Map(session.allocations.map((a) => [a.taskId, a.minutes]));
  const after = new Map(clean.map((a) => [a.taskId, a.minutes]));
  const touched = new Set([...before.keys(), ...after.keys()]);
  return {
    ...d,
    sessions: d.sessions.map((s) => (s.id === sessionId ? { ...s, allocations: clean } : s)),
    tasks: d.tasks.map((t) => {
      if (!touched.has(t.id)) return t;
      const delta = (after.get(t.id) ?? 0) - (before.get(t.id) ?? 0);
      if (!delta) return t;
      const next = (t.actualMinutes ?? 0) + delta;
      return { ...t, actualMinutes: next > 0 ? next : null, updatedAt: now };
    }),
  };
}
