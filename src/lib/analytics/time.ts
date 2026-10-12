import { localDateOf } from "@/lib/date";
import type { SprintId, SprintSession, Task } from "@/types";

/** A completed task with at least one recorded duration. */
export interface TimeRecord {
  task: Task;
  completedOn: string | null;
  estimated: number | null;
  actual: number | null;
  /** Actual − estimated, only when both exist. Positive = took longer. */
  difference: number | null;
  /** Actual as a % of the estimate (only when the estimate is above zero). */
  ratio: number | null;
}

export function toTimeRecord(task: Task): TimeRecord {
  const estimated = task.estimatedMinutes;
  const actual = task.actualMinutes;
  const paired = estimated !== null && actual !== null;
  return {
    task,
    completedOn: task.completedAt ? localDateOf(task.completedAt) : null,
    estimated,
    actual,
    difference: paired ? actual - estimated : null,
    ratio: paired && estimated > 0 ? Math.round((actual / estimated) * 100) : null,
  };
}

/** Completed tasks with an estimate or an actual time, newest first. */
export function getTimeRecords(tasks: Task[]) {
  return tasks
    .filter((t) => t.status === "completed" && (t.estimatedMinutes !== null || t.actualMinutes !== null))
    .map(toTimeRecord)
    .sort((a, b) => (b.task.completedAt ?? "").localeCompare(a.task.completedAt ?? ""));
}

export type Accuracy = "on_target" | "longer" | "quicker";

/** Within ±10% (or ±2 minutes for tiny tasks) counts as on target. */
export function accuracyOf(r: TimeRecord): Accuracy | null {
  if (r.difference === null || r.estimated === null) return null;
  const tolerance = Math.max(2, r.estimated * 0.1);
  if (Math.abs(r.difference) <= tolerance) return "on_target";
  return r.difference > 0 ? "longer" : "quicker";
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
function median(xs: number[]) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Paired statistics: only records with both an estimate and an actual time.
 * Missing values are excluded, never treated as zero.
 */
export function getEstimationStats(records: TimeRecord[]) {
  const paired = records.filter((r) => r.difference !== null);
  const diffs = paired.map((r) => r.difference!);
  return {
    count: paired.length,
    averageDifference: mean(diffs),
    medianDifference: median(diffs),
    percentOver: paired.length ? Math.round((paired.filter((r) => r.difference! > 0).length / paired.length) * 100) : null,
    overCount: paired.filter((r) => r.difference! > 0).length,
    averageEstimated: mean(paired.map((r) => r.estimated!)),
    averageActual: mean(paired.map((r) => r.actual!)),
    estimateOnly: records.filter((r) => r.estimated !== null && r.actual === null).length,
    actualOnly: records.filter((r) => r.estimated === null && r.actual !== null).length,
  };
}

/** The minimum number of comparable records before any pattern is described. */
export const MIN_RECORDS_FOR_INSIGHT = 5;

/**
 * Plain, factual observations — only when there's enough data. Groups by
 * Sprint (the kind of work) since that's how tasks are categorised.
 */
export function getEstimationInsights(records: TimeRecord[], sprintName: (id: SprintId) => string): string[] {
  const paired = records.filter((r) => r.difference !== null);
  if (paired.length < MIN_RECORDS_FOR_INSIGHT) return [];
  const insights: string[] = [];
  const overall = getEstimationStats(paired);
  const avg = Math.round(overall.averageDifference!);
  if (Math.abs(avg) <= Math.max(2, (overall.averageEstimated ?? 0) * 0.1)) {
    insights.push(`On average, your recorded tasks finish close to their estimates (${formatSigned(avg)} min across ${paired.length} tasks).`);
  } else {
    insights.push(
      `Your average recorded task takes ${Math.abs(avg)} minutes ${avg > 0 ? "longer" : "less"} than estimated (across ${paired.length} tasks).`,
    );
  }

  const bySprint = new Map<SprintId, TimeRecord[]>();
  for (const r of paired) if (r.task.sprint) bySprint.set(r.task.sprint, [...(bySprint.get(r.task.sprint) ?? []), r]);
  for (const [sprint, group] of bySprint) {
    if (group.length < MIN_RECORDS_FOR_INSIGHT) continue;
    const stats = getEstimationStats(group);
    const over = group.filter((r) => r.difference! > 0).length;
    const under = group.filter((r) => r.difference! < 0).length;
    const name = sprintName(sprint);
    const avgDiff = Math.round(stats.averageDifference!);
    if (over / group.length >= 0.7 && avgDiff > 0) {
      insights.push(`You tend to underestimate ${name} tasks: ${over} of ${group.length} took longer (${formatSigned(avgDiff)} min on average).`);
    } else if (under / group.length >= 0.7 && avgDiff < 0) {
      insights.push(`You tend to overestimate ${name} tasks: ${under} of ${group.length} were quicker (${formatSigned(avgDiff)} min on average).`);
    } else if (Math.abs(avgDiff) <= Math.max(2, (stats.averageEstimated ?? 0) * 0.1)) {
      insights.push(`Your estimates for ${name} tasks are generally close to actual durations (${group.length} tasks).`);
    }
  }
  return insights;
}

export const formatSigned = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "±0");

/* ---------------- Sessions ---------------- */

export const sessionMinutes = (s: SprintSession) => Math.round(s.accumulatedElapsedSeconds / 60);
export const allocatedMinutes = (s: SprintSession) => s.allocations.reduce((sum, a) => sum + a.minutes, 0);

/** Finished sessions whose end falls between `from` and `to` (local dates, inclusive). */
export function sessionsBetween(sessions: SprintSession[], from: string, to: string) {
  return sessions.filter((s) => {
    if (s.status !== "ended" || !s.endedAt) return false;
    const d = localDateOf(s.endedAt);
    return d >= from && d <= to;
  });
}

/**
 * Focus time is measured by sessions only — never added to tasks' actual
 * time — so allocated minutes can't be counted twice.
 */
export function getFocusStats(sessions: SprintSession[]) {
  const seconds = sessions.reduce((s, x) => s + x.accumulatedElapsedSeconds, 0);
  const planned = sessions.reduce((s, x) => s + x.plannedMinutes, 0);
  const bySprint = new Map<SprintId, number>();
  for (const s of sessions) bySprint.set(s.sprintId, (bySprint.get(s.sprintId) ?? 0) + s.accumulatedElapsedSeconds);
  return {
    count: sessions.length,
    totalMinutes: Math.round(seconds / 60),
    plannedMinutes: planned,
    averageMinutes: sessions.length ? Math.round(seconds / 60 / sessions.length) : null,
    bySprint,
  };
}
