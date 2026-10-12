import { addDays, localDateOf, startOfWeek } from "@/lib/date";
import type { ISODate, SprintId, Task } from "@/types";

export type Bucket = { key: ISODate; label: string; from: ISODate; to: ISODate; count: number };

/** Completed tasks per day or per Monday–Sunday week, across the range. */
export function getCompletionTrend(tasks: Task[], from: ISODate, to: ISODate, unit: "day" | "week"): Bucket[] {
  const dates = tasks
    .filter((t) => t.status === "completed" && t.completedAt)
    .map((t) => localDateOf(t.completedAt!))
    .filter((d) => d >= from && d <= to);
  const buckets: Bucket[] = [];
  if (unit === "day") {
    for (let d = from; d <= to; d = addDays(d, 1)) buckets.push({ key: d, label: d, from: d, to: d, count: 0 });
  } else {
    for (let w = startOfWeek(from); w <= to; w = addDays(w, 7)) {
      buckets.push({ key: w, label: w, from: w < from ? from : w, to: addDays(w, 6) > to ? to : addDays(w, 6), count: 0 });
    }
  }
  for (const d of dates) {
    const b = buckets.find((x) => d >= x.from && d <= x.to);
    if (b) b.count++;
  }
  return buckets;
}

/** Completed tasks per Sprint (Unassigned shown separately). */
export function getSprintDistribution(completed: Task[]) {
  const total = completed.length;
  const counts = new Map<SprintId | null, number>();
  for (const t of completed) counts.set(t.sprint, (counts.get(t.sprint) ?? 0) + 1);
  return { total, counts, percent: (n: number) => (total ? Math.round((n / total) * 100) : 0) };
}
