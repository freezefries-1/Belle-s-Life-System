import { createId } from "@/lib/id";
import type {
  BenchmarkUnit,
  ISODate,
  ISODateTime,
  MatchFormat,
  MatchKind,
  Sport,
  StudentBenchmark,
  StudentBenchmarkInput,
  StudentMatch,
  StudentMatchInput,
  StudentRating,
  StudentRatingInput,
} from "@/types";

/* ---------------- benchmarks ---------------- */

export interface BenchmarkTest {
  test: string;
  name: string;
  unit: BenchmarkUnit;
  higherIsBetter: boolean;
  /** Built-in tests belong to one sport. */
  sport?: Sport;
  /** Suggested targets by rating level (pickleball, from coaching sources), e.g. { 4.5: 7, 5: 8 }. */
  targets?: Record<number, number>;
}

/** The built-in pickleball tests, with suggested targets for DUPR 4.5 and 5.0 (editable later). */
export const PICKLEBALL_TESTS: BenchmarkTest[] = [
  { test: "pb_dink_rally", name: "Crosscourt dink rally without a miss", unit: "balls", higherIsBetter: true, sport: "pickleball", targets: { 4.5: 30, 5: 50 } },
  { test: "pb_third_drop", name: "Third-shot drops into the kitchen", unit: "out_of_10", higherIsBetter: true, sport: "pickleball", targets: { 4.5: 7, 5: 8 } },
  { test: "pb_reset", name: "Resets from mid-court against drives", unit: "out_of_10", higherIsBetter: true, sport: "pickleball", targets: { 4.5: 6, 5: 8 } },
  { test: "pb_deep_return", name: "Deep returns", unit: "out_of_10", higherIsBetter: true, sport: "pickleball", targets: { 4.5: 8, 5: 9 } },
  { test: "pb_deep_serve", name: "Deep serves", unit: "out_of_10", higherIsBetter: true, sport: "pickleball", targets: { 4.5: 7, 5: 8 } },
];

/** The built-in tests. Your own tests are saved with each result as "custom:<name>". */
export const BUILTIN_TESTS: BenchmarkTest[] = [
  { test: "rally_short", name: "Rally, short court (centre to centre)", unit: "balls", higherIsBetter: true },
  { test: "rally_baseline", name: "Rally, baseline (centre to centre)", unit: "balls", higherIsBetter: true },
  { test: "crosscourt_fh", name: "Crosscourt rally, forehand", unit: "balls", higherIsBetter: true },
  { test: "crosscourt_bh", name: "Crosscourt rally, backhand", unit: "balls", higherIsBetter: true },
  { test: "first_serves", name: "First serves in", unit: "out_of_10", higherIsBetter: true },
  { test: "second_serves", name: "Second serves in", unit: "out_of_10", higherIsBetter: true },
  { test: "volleys_target", name: "Volleys to a target", unit: "out_of_10", higherIsBetter: true },
  ...PICKLEBALL_TESTS,
];

const sportOfTest = (t: BenchmarkTest) => t.sport ?? "tennis";

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

/**
 * The tests you can choose when recording a result: the sport's built-in
 * ones, plus your own from earlier results (pass only that sport's results).
 */
export function availableTests(all: StudentBenchmark[], sport: Sport = "tennis"): BenchmarkTest[] {
  const custom = new Map<string, BenchmarkTest>();
  for (const r of [...all].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt)))
    if (r.test.startsWith("custom:")) custom.set(r.test, { test: r.test, name: r.name, unit: r.unit, higherIsBetter: r.higherIsBetter });
  return [...BUILTIN_TESTS.filter((t) => sportOfTest(t) === sport), ...[...custom.values()].sort((a, b) => a.name.localeCompare(b.name))];
}

export const targetsFor = (test: string) => BUILTIN_TESTS.find((t) => t.test === test)?.targets;

/* ---------------- My Pickleball: focus next ---------------- */

/** The next rating level to aim for, from the latest rating: 4.5, then 5.0. */
export function nextLevel(rating: number | null) {
  return rating !== null && rating >= 4.5 ? 5 : 4.5;
}

export interface FocusItem {
  test: BenchmarkTest;
  target: number;
  latest: StudentBenchmark | null;
  /** How far short of the target, as a share of it (0 = reached); null when not measured yet. */
  gap: number | null;
}

/**
 * What to work on next: the pickleball tests furthest from the next level's
 * target (biggest gap first), then tests not measured yet. Reached targets
 * are left out.
 */
export function focusNext(results: StudentBenchmark[], studentId: string, level: number): FocusItem[] {
  const series = new Map(benchmarkSeries(results, studentId).map((s) => [s.test, s]));
  const items: FocusItem[] = PICKLEBALL_TESTS.map((t) => {
    const target = t.targets![level] ?? t.targets![5];
    const s = series.get(t.test);
    if (!s) return { test: t, target, latest: null, gap: null };
    return { test: t, target, latest: s.latest, gap: Math.max(0, (target - s.latest.value) / target) };
  });
  const measured = items.filter((i) => i.gap !== null && i.gap > 0).sort((a, b) => b.gap! - a.gap!);
  return [...measured, ...items.filter((i) => i.gap === null)];
}

/* ---------------- ratings (DUPR) ---------------- */

export function createRating(studentId: string, input: StudentRatingInput, now: ISODateTime): StudentRating {
  return { id: createId(), studentId, ...input, rating: Math.round(input.rating * 1000) / 1000, note: input.note.trim(), createdAt: now, updatedAt: now };
}

/** A kind's ratings, oldest first. */
export function ratingHistory(all: StudentRating[], studentId: string, kind: MatchFormat) {
  return all
    .filter((r) => r.studentId === studentId && r.kind === kind)
    .sort((a, b) => a.ratedOn.localeCompare(b.ratedOn) || a.createdAt.localeCompare(b.createdAt));
}

/** DUPR-style: two decimals, or three when the third matters (4.10, 4.123). */
export const formatRating = (n: number) => n.toFixed(Math.abs(n * 100 - Math.round(n * 100)) < 1e-6 ? 2 : 3);

export function createBenchmark(studentId: string, input: StudentBenchmarkInput, now: ISODateTime): StudentBenchmark {
  return { id: createId(), studentId, ...input, name: input.name.trim(), note: input.note.trim(), createdAt: now, updatedAt: now };
}

/* ---------------- matches ---------------- */

export const MATCH_KIND_LABELS = { tournament: "Tournament", club: "Club competition", practice: "Practice match" } as const;
export const PICKLEBALL_KIND_LABELS: Record<MatchKind, string> = { tournament: "Tournament", club: "Round robin / league", practice: "Social / rec play" };
export const kindLabels = (sport: Sport): Record<MatchKind, string> => (sport === "pickleball" ? PICKLEBALL_KIND_LABELS : MATCH_KIND_LABELS);

/** Ways a point can be lost, for the optional tallies (pickleball). */
export const POINT_LOSS_REASONS: { key: string; label: string }[] = [
  { key: "serve", label: "Serve or return error" },
  { key: "third", label: "Third-shot error" },
  { key: "reset", label: "Reset popped up or missed" },
  { key: "dink", label: "Dink error" },
  { key: "speedup", label: "Speed-up error (attacked too early)" },
  { key: "hands", label: "Lost a hand battle" },
  { key: "lob", label: "Lob or overhead" },
  { key: "other", label: "Other" },
];

/* ---------------- kitchen arrival (KAP) ---------------- */

/**
 * Kitchen-arrival tallies for third-shot situations (from the Brighter
 * Pickleball KAP worksheet): a success is both players arriving at the
 * kitchen line balanced, or winning the point before getting there.
 */
export const KAP_FIELDS = {
  drop_ok: "Drop: arrived",
  drop_miss: "Drop: didn't arrive",
  drive_ok: "Drive: arrived",
  drive_miss: "Drive: didn't arrive",
  third_err: "3rd shot errors",
  fifth_err: "5th shot errors",
  seventh_err: "7th shot errors",
} as const;
export type KapField = keyof typeof KAP_FIELDS;

const n = (s: Record<string, number>, k: KapField) => s[k] ?? 0;

/** One match's (or several matches' summed) KAP numbers; percentages are null without any thirds. */
export function kapOf(stats: Record<string, number>) {
  const dropOk = n(stats, "drop_ok");
  const dropTotal = dropOk + n(stats, "drop_miss");
  const driveOk = n(stats, "drive_ok");
  const driveTotal = driveOk + n(stats, "drive_miss");
  const thirds = dropTotal + driveTotal;
  return {
    thirds,
    arrived: dropOk + driveOk,
    kap: percent(dropOk + driveOk, thirds),
    dropKap: percent(dropOk, dropTotal),
    driveKap: percent(driveOk, driveTotal),
    drops: dropTotal,
    drives: driveTotal,
    thirdErrors: n(stats, "third_err"),
    fifthErrors: n(stats, "fifth_err"),
    seventhErrors: n(stats, "seventh_err"),
    thirdErrorRate: percent(n(stats, "third_err"), thirds),
  };
}

/** KAP across matches (tallies added up), and per match, oldest first, for the trend. */
export function kapSummary(matches: StudentMatch[]) {
  const withKap = matches.filter((m) => kapOf(m.kapStats).thirds > 0);
  const total: Record<string, number> = {};
  for (const m of withKap) for (const [k, v] of Object.entries(m.kapStats)) total[k] = (total[k] ?? 0) + v;
  return {
    matches: withKap.length,
    overall: kapOf(total),
    perMatch: [...withKap]
      .sort((a, b) => a.playedOn.localeCompare(b.playedOn) || a.createdAt.localeCompare(b.createdAt))
      .map((m) => ({ match: m, ...kapOf(m.kapStats) })),
  };
}

/** Total points lost by reason across matches, largest first (reasons never counted are left out). */
export function pointLossSummary(matches: StudentMatch[]) {
  const totals = new Map<string, number>();
  for (const m of matches) for (const [k, n] of Object.entries(m.pointLosses)) totals.set(k, (totals.get(k) ?? 0) + n);
  const counted = matches.filter((m) => Object.keys(m.pointLosses).length > 0).length;
  return {
    matches: counted,
    reasons: POINT_LOSS_REASONS.filter((r) => totals.has(r.key))
      .map((r) => ({ ...r, total: totals.get(r.key)! }))
      .sort((a, b) => b.total - a.total),
  };
}

/** Doubles record with each partner (names matched ignoring case and extra spaces), most matches first. */
export function partnerRecords(matches: StudentMatch[]) {
  const byKey = new Map<string, { name: string; matches: StudentMatch[] }>();
  for (const m of matches) {
    if (m.format !== "doubles" || !m.partner.trim()) continue;
    const key = m.partner.trim().toLowerCase().replace(/\s+/g, " ");
    const entry = byKey.get(key) ?? { name: m.partner.trim(), matches: [] };
    entry.matches.push(m);
    byKey.set(key, entry);
  }
  return [...byKey.values()]
    .map(({ name, matches: list }) => {
      const sorted = [...list].sort((a, b) => b.playedOn.localeCompare(a.playedOn));
      const wins = list.filter((m) => m.result === "win").length;
      return { name, played: list.length, wins, losses: list.length - wins, winRate: percent(wins, list.length), last: sorted[0] };
    })
    .sort((a, b) => b.played - a.played || a.name.localeCompare(b.name));
}

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
    partner: input.partner.trim(),
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
