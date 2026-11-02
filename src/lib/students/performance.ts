import { createId } from "@/lib/id";
import type { BenchmarkUnit, ISODate, ISODateTime, StudentBenchmark, StudentBenchmarkInput, StudentMatch, StudentMatchInput } from "@/types";

/* ---------------- benchmarks ---------------- */

export interface BenchmarkTest {
  test: string;
  name: string;
  unit: BenchmarkUnit;
  higherIsBetter: boolean;
}

/** The built-in tests. Your own tests are saved with each result as "custom:<name>". */
export const BUILTIN_TESTS: BenchmarkTest[] = [
  { test: "rally_short", name: "Rally, short court (centre to centre)", unit: "balls", higherIsBetter: true },
  { test: "rally_baseline", name: "Rally, baseline (centre to centre)", unit: "balls", higherIsBetter: true },
  { test: "crosscourt_fh", name: "Crosscourt rally, forehand", unit: "balls", higherIsBetter: true },
  { test: "crosscourt_bh", name: "Crosscourt rally, backhand", unit: "balls", higherIsBetter: true },
  { test: "first_serves", name: "First serves in", unit: "out_of_10", higherIsBetter: true },
  { test: "second_serves", name: "Second serves in", unit: "out_of_10", higherIsBetter: true },
  { test: "volleys_target", name: "Volleys to a target", unit: "out_of_10", higherIsBetter: true },
];

export const UNIT_LABELS: Record<BenchmarkUnit, string> = {
  balls: "Balls in a rally",
  out_of_10: "Out of 10",
  count: "A number",
  seconds: "Time (seconds)",
};

export const customTestKey = (name: string) => `custom:${name.trim().toLowerCase().replace(/\s+/g, " ")}`;

/** "7/10 (70%)", "18 balls", "12.4 s". */
export function formatBenchmark(unit: BenchmarkUnit, value: number) {
  const n = Number.isInteger(value) ? String(value) : value.toFixed(1);
  switch (unit) {
    case "out_of_10":
      return `${n}/10 (${Math.round(value * 10)}%)`;
    case "balls":
      return `${n} ${value === 1 ? "ball" : "balls"}`;
    case "seconds":
      return `${n} s`;
    default:
      return n;
  }
}

/** Value on a chart's scale: "out of 10" tests are shown as a percentage. */
export const chartValue = (unit: BenchmarkUnit, value: number) => (unit === "out_of_10" ? value * 10 : value);

export interface BenchmarkSeries extends BenchmarkTest {
  /** Oldest first. */
  results: StudentBenchmark[];
  latest: StudentBenchmark;
  best: StudentBenchmark;
  first: StudentBenchmark;
  /** Latest minus first, signed so positive always means "better". Null with one result. */
  improvement: number | null;
}

/** A student's results grouped by test (built-in tests first, in order, then yours by name). */
export function benchmarkSeries(all: StudentBenchmark[], studentId: string): BenchmarkSeries[] {
  const byTest = new Map<string, StudentBenchmark[]>();
  for (const r of all) {
    if (r.studentId !== studentId) continue;
    byTest.set(r.test, [...(byTest.get(r.test) ?? []), r]);
  }
  const order = (test: string) => {
    const i = BUILTIN_TESTS.findIndex((t) => t.test === test);
    return i < 0 ? BUILTIN_TESTS.length : i;
  };
  return [...byTest.entries()]
    .map(([test, list]): BenchmarkSeries => {
      const results = [...list].sort((a, b) => a.measuredOn.localeCompare(b.measuredOn) || a.createdAt.localeCompare(b.createdAt));
      const latest = results.at(-1)!;
      const first = results[0];
      const better = (a: StudentBenchmark, b: StudentBenchmark) => (latest.higherIsBetter ? a.value > b.value : a.value < b.value);
      const best = results.reduce((x, r) => (better(r, x) ? r : x), first);
      const diff = latest.value - first.value;
      return {
        test,
        // Name, unit and direction from the latest result, so renaming a custom test follows through.
        name: latest.name,
        unit: latest.unit,
        higherIsBetter: latest.higherIsBetter,
        results,
        latest,
        best,
        first,
        improvement: results.length > 1 ? (latest.higherIsBetter ? diff : -diff) : null,
      };
    })
    .sort((a, b) => order(a.test) - order(b.test) || a.name.localeCompare(b.name));
}

/** The tests you can choose when recording a result: the built-in ones, plus your own from earlier results. */
export function availableTests(all: StudentBenchmark[]): BenchmarkTest[] {
  const custom = new Map<string, BenchmarkTest>();
  for (const r of [...all].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt)))
    if (r.test.startsWith("custom:")) custom.set(r.test, { test: r.test, name: r.name, unit: r.unit, higherIsBetter: r.higherIsBetter });
  return [...BUILTIN_TESTS, ...[...custom.values()].sort((a, b) => a.name.localeCompare(b.name))];
}

export function createBenchmark(studentId: string, input: StudentBenchmarkInput, now: ISODateTime): StudentBenchmark {
  return { id: createId(), studentId, ...input, name: input.name.trim(), note: input.note.trim(), createdAt: now, updatedAt: now };
}

/* ---------------- matches ---------------- */

export const MATCH_KIND_LABELS = { tournament: "Tournament", club: "Club competition", practice: "Practice match" } as const;

/** Whole-number percentage, or null when it can't be worked out. */
export function percent(part: number | null, whole: number | null) {
  return part === null || whole === null || whole <= 0 ? null : Math.round((part / whole) * 100);
}

export function createMatch(studentId: string, input: StudentMatchInput, now: ISODateTime): StudentMatch {
  return {
    id: createId(),
    studentId,
    ...input,
    event: input.event.trim(),
    opponent: input.opponent.trim(),
    score: input.score.trim(),
    notes: input.notes.trim(),
    createdAt: now,
    updatedAt: now,
  };
}

/** Newest first. */
export function matchesOf(all: StudentMatch[], studentId: string) {
  return all.filter((m) => m.studentId === studentId).sort((a, b) => b.playedOn.localeCompare(a.playedOn) || b.createdAt.localeCompare(a.createdAt));
}

export function matchRecord(matches: StudentMatch[], today: ISODate) {
  const year = today.slice(0, 4);
  const count = (list: StudentMatch[]) => {
    const wins = list.filter((m) => m.result === "win").length;
    return { wins, losses: list.length - wins, played: list.length, winRate: percent(wins, list.length) };
  };
  return {
    all: count(matches),
    thisYear: count(matches.filter((m) => m.playedOn.startsWith(year))),
    /** The last five, oldest first (read left to right). */
    form: [...matches].sort((a, b) => a.playedOn.localeCompare(b.playedOn) || a.createdAt.localeCompare(b.createdAt)).slice(-5),
  };
}

/** Wins and losses per month for the last `months` months up to today (oldest first). */
export function matchesByMonth(matches: StudentMatch[], today: ISODate, months = 6) {
  const [y, m] = today.split("-").map(Number);
  const out: { month: string; wins: number; losses: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const inMonth = matches.filter((x) => x.playedOn.startsWith(key));
    out.push({ month: key, wins: inMonth.filter((x) => x.result === "win").length, losses: inMonth.filter((x) => x.result === "loss").length });
  }
  return out;
}
