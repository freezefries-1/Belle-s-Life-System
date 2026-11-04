import { LEGACY_PROJECTS } from "@/data/legacy-projects";
import { addDays, parseISODate, startOfWeek as startOfWeekOf } from "@/lib/date";
import { createCapture } from "@/lib/brain-dump/capture-model";
import { createCommitment } from "@/lib/daily/commitments";
import { createHighlight, createLog } from "@/lib/daily/day";
import { createMilestone, createProject } from "@/lib/projects/project-model";
import { createTemplate } from "@/lib/recurrence/recurrence";
import { createSession, endSession, runSession } from "@/lib/sessions/session-model";
import { createWeeklyReview } from "@/lib/review/weekly";
import { createId } from "@/lib/id";
import { BUILTIN_TESTS, createBenchmark, createMatch, createRating, customTestKey } from "@/lib/students/performance";
import { createLesson, createStudent } from "@/lib/students/student-model";
import { createTask } from "@/lib/tasks/task-model";
import type {
  Capture,
  CaptureInput,
  CommitmentCompletion,
  DailyHighlight,
  ISODate,
  KaizenLog,
  MilestoneInput,
  PersistedData,
  SprintId,
  SprintSession,
  StudentStage,
  WeeklyPriority,
  ProjectInput,
  RecurrenceInput,
  Task,
  TaskInput,
} from "@/types";

/**
 * Optional sample tasks and Brain Dump entries — a realistic week in
 * Belle's life. Only loaded when explicitly requested ("Explore with sample
 * data"), never over existing saved data.
 */
export function createSampleData(today: ISODate): PersistedData {
  const d = (offset: number) => addDays(today, offset);
  /** A timestamp `offset` days from today at the given hour (local time). */
  const at = (offset: number, hour: number) => {
    const date = parseISODate(d(offset));
    date.setHours(hour, 0, 0, 0);
    return date.toISOString();
  };

  type Seed = TaskInput & { created: number; done?: number };
  const seeds: Seed[] = [
    // Sprint 1 — Urgent
    { title: "Reply to urgent customer enquiry", sprint: "urgent", projectId: "p_sportcraft", priority: "high", dueDate: d(0), estimatedMinutes: 15, created: -1 },
    { title: "Confirm court booking for Saturday clinic", sprint: "urgent", projectId: "p_coaching", priority: "high", dueDate: d(0), estimatedMinutes: 10, actualMinutes: 8, status: "completed", created: -2, done: 0 },
    { title: "Pay court hire invoice", sprint: "urgent", projectId: "p_coaching", priority: "medium", dueDate: d(1), estimatedMinutes: 10, created: -3 },
    // Sprint 2 — Deadlines
    { title: "Prepare Evolve Tennis Ladder tournament materials", description: "Draw sheets, rules summary, prize list.", sprint: "deadlines", projectId: "p_ladder", priority: "high", status: "in_progress", dueDate: d(3), estimatedMinutes: 90, created: -4 },
    { title: "Send ladder round 4 results", sprint: "deadlines", projectId: "p_ladder", priority: "medium", dueDate: d(2), estimatedMinutes: 30, created: -2 },
    { title: "Finalise SportCraft supplier order", sprint: "deadlines", projectId: "p_sportcraft", priority: "medium", dueDate: d(5), estimatedMinutes: 45, created: -5 },
    // Sprint 3 — Admin & Life
    { title: "Schedule next week’s tennis students", sprint: "admin", projectId: "p_coaching", priority: "high", dueDate: d(0), estimatedMinutes: 30, created: -1 },
    { title: "Update expenses", sprint: "admin", projectId: "p_life", priority: "low", dueDate: d(0), estimatedMinutes: 20, created: -6 },
    { title: "Change bedsheets", sprint: "admin", projectId: "p_life", dueDate: d(0), estimatedMinutes: 15, actualMinutes: 20, status: "completed", created: -1, done: 0 },
    { title: "Book the dog’s vet check-up", sprint: "admin", projectId: "p_life", priority: "low", dueDate: d(-1), estimatedMinutes: 10, created: -5 },
    // Sprint 4 — Build & Create
    { title: "Develop SportCraft website", sprint: "build", projectId: "p_sportcraft", priority: "medium", status: "in_progress", dueDate: d(21), estimatedMinutes: 120, created: -9 },
    { title: "Design tournament materials", sprint: "build", projectId: "p_ladder", priority: "medium", dueDate: d(4), estimatedMinutes: 60, created: -3 },
    { title: "Plan a new pickleball clinic", sprint: "build", projectId: "p_coaching", estimatedMinutes: 45, created: -2 },
    { title: "Write product descriptions for new paddles", sprint: "build", projectId: "p_sportcraft", priority: "low", estimatedMinutes: 40, created: -7 },
    // Not yet sorted into a sprint
    { title: "Research court resurfacing quotes", projectId: "p_coaching", created: -2 },
    // Recently completed — feeds Time Estimation and Weekly Review
    { title: "Set up SportCraft product catalogue", sprint: "build", projectId: "p_sportcraft", estimatedMinutes: 60, actualMinutes: 95, status: "completed", created: -8, done: -3 },
    { title: "Draft ladder rules document", sprint: "deadlines", projectId: "p_ladder", estimatedMinutes: 45, actualMinutes: 40, status: "completed", created: -9, done: -5 },
    { title: "Restring two racquets", sprint: "admin", projectId: "p_coaching", estimatedMinutes: 30, actualMinutes: 50, status: "completed", created: -4, done: -2 },
    { title: "Weekly grocery shop", sprint: "admin", projectId: "p_life", estimatedMinutes: 45, actualMinutes: 60, status: "completed", created: -3, done: -1 },
    { title: "Update coaching availability online", sprint: "admin", projectId: "p_coaching", estimatedMinutes: 15, actualMinutes: 10, status: "completed", created: -6, done: -4 },
    { title: "Create ladder player sign-up form", sprint: "build", projectId: "p_ladder", estimatedMinutes: 30, actualMinutes: 35, status: "completed", created: -10, done: -6 },
    { title: "Photograph new grip tape stock", sprint: "build", projectId: "p_sportcraft", estimatedMinutes: 30, actualMinutes: 45, status: "completed", created: -5, done: -2 },
    { title: "Reconcile SportCraft invoices", sprint: "admin", projectId: "p_sportcraft", estimatedMinutes: 20, actualMinutes: 35, status: "completed", created: -12, done: -9 },
    { title: "Renew car insurance", sprint: "admin", projectId: "p_life", estimatedMinutes: 15, actualMinutes: 25, status: "completed", created: -14, done: -11 },
    { title: "Sketch pickleball clinic flyer", sprint: "build", projectId: "p_coaching", estimatedMinutes: 40, actualMinutes: 40, status: "completed", created: -15, done: -12 },
    { title: "Edit coaching drill video", sprint: "build", projectId: "p_coaching", estimatedMinutes: 60, actualMinutes: 55, status: "completed", created: -16, done: -13 },
    { title: "Email ladder players about round 3", sprint: "deadlines", projectId: "p_ladder", estimatedMinutes: 20, status: "completed", created: -12, done: -10 },
  ];

  const tasks: Task[] = seeds.map(({ created, done, ...input }, index) => {
    const task = createTask(input, at(created, 9), { sortOrder: (index + 1) * 1000 });
    return done === undefined ? task : { ...task, completedAt: at(done, 16), updatedAt: at(done, 16) };
  });

  const captureSeeds: (CaptureInput & { offset: number; hour: number })[] = [
    { title: "Order Hyper-G strings", kind: "task", offset: 0, hour: 8 },
    { title: "Buy dog food", kind: "reminder", offset: 0, hour: 9 },
    { title: "Update SportCraft product prices", kind: "task", offset: 0, hour: 10 },
    { title: "Plan pickleball drilling session", kind: "task", note: "Dinking ladder + third-shot drops", offset: -1, hour: 18 },
    { title: "Clean bathroom mirror", kind: "task", offset: -1, hour: 20 },
    { title: "Doubles round-robin social night for ladder players?", kind: "idea", offset: -2, hour: 21 },
    { title: "Monthly SportCraft newsletter — new arrivals + coaching tips", kind: "idea", offset: -3, hour: 12 },
  ];
  const captures: Capture[] = captureSeeds.map(({ offset, hour, ...input }) => createCapture(input, at(offset, hour)));

  const byTitle = (title: string) => tasks.find((t) => t.title === title)!;

  // Micro-commitments, started a fortnight ago, with a lived-in history.
  const commitments = [
    createCommitment({ title: "Read 5 pages", description: "Any book counts. Five pages is enough.", targetMinutes: 10, frequency: "daily", startDate: d(-14) }, d(-14), at(-14, 8)),
    createCommitment({ title: "10-minute home reset", description: "Set a timer. Reset one space. Stop when it rings.", targetMinutes: 10, frequency: "daily", startDate: d(-14) }, d(-14), at(-14, 8)),
    createCommitment({ title: "Practise Thai", targetMinutes: 5, frequency: "weekdays", selectedWeekdays: [1, 2, 3, 4, 5], startDate: d(-14) }, d(-14), at(-14, 8)),
    createCommitment({ title: "Review the ladder standings", frequency: "weekly", startDate: d(-21) }, d(-21), at(-21, 8)),
  ];
  const [read, reset, thai, ladder] = commitments;
  const tick = (commitmentId: string, offsets: number[]): CommitmentCompletion[] =>
    offsets.map((o) => ({ id: createId(), commitmentId, dateKey: d(-o), completedAt: at(-o, 20) }));
  const weekdayOffsets = Array.from({ length: 14 }, (_, i) => i + 1).filter((o) => {
    const day = parseISODate(d(-o)).getDay();
    return day >= 1 && day <= 5;
  });
  const commitmentCompletions = [
    ...tick(read.id, [0, 1, 2, 3, 5, 6, 7, 9, 10]),
    ...tick(reset.id, [1, 2, 4, 5, 6, 8, 9, 11]),
    ...tick(thai.id, weekdayOffsets.filter((_, i) => i % 3 !== 2)),
    ...tick(ladder.id, [8, 15]),
  ];

  // Past highlights (all completed) — today's is left for Belle to choose.
  const highlights: DailyHighlight[] = [
    createHighlight(d(-1), byTitle("Weekly grocery shop"), at(-1, 8)),
    createHighlight(d(-2), byTitle("Photograph new grip tape stock"), at(-2, 8)),
    createHighlight(d(-3), byTitle("Set up SportCraft product catalogue"), at(-3, 8)),
  ];

  const log = (offset: number, words: Partial<KaizenLog>): KaizenLog => ({ ...createLog(d(offset), at(offset, 21)), ...words });
  const kaizenLogs: KaizenLog[] = [
    log(-1, {
      reflectionWentWell: "Did the shop straight after morning lessons — no decision fatigue later.",
      reflectionImprove: "Started the evening scrolling instead of the shutdown routine.",
      reflectionLearned: "Phone on charge in the kitchen helps me wind down.",
      notes: "Had a productive drilling session today. Need to work on making decisions earlier during transition.",
    }),
    log(-2, {
      reflectionWentWell: "Photos look great and are ready for the website.",
      reflectionImprove: "It took 45 minutes, not 30 — light setup takes time.",
    }),
    log(-3, {
      reflectionWentWell: "Deep work in the morning before lessons was really productive.",
      reflectionLearned: "90-minute blocks suit build work.",
    }),
  ];

  // Projects (sample ids match the tasks above), milestones and recurring tasks.
  const project = (id: keyof typeof LEGACY_PROJECTS, extra: Partial<ProjectInput>) => ({
    ...createProject({ ...LEGACY_PROJECTS[id], ...extra, name: LEGACY_PROJECTS[id].name }, at(-30, 9)),
    id,
  });
  const projects = [
    project("p_sportcraft", { status: "active", priority: "high", startDate: d(-30), targetDate: d(30), preparationDate: d(16), notes: "Launch checklist:\n- Product photos\n- Pricing review\n- Payment test" }),
    project("p_ladder", { status: "active", priority: "high", startDate: d(-40), targetDate: d(18), preparationDate: d(4) }),
    project("p_coaching", { status: "active", priority: "medium" }),
    project("p_life", { status: "active", priority: "low" }),
  ];
  const milestone = (projectId: string, title: string, order: number, extra: Partial<MilestoneInput>) =>
    createMilestone(projectId, { title, ...extra }, order * 1000, at(-20, 9));
  const milestones = [
    { ...milestone("p_ladder", "Registration closes", 1, { targetDate: d(-3), status: "completed" }), completedAt: at(-3, 17) },
    milestone("p_ladder", "Participant packs dispatched", 2, { targetDate: d(3), preparationDate: d(-1), status: "in_progress" }),
    milestone("p_ladder", "Group stage ends", 3, { targetDate: d(10) }),
    milestone("p_ladder", "Finals completed", 4, { targetDate: d(18), preparationDate: d(11) }),
    milestone("p_sportcraft", "Website launch", 1, { targetDate: d(21), preparationDate: d(14) }),
  ];
  const linkMilestone = (title: string, milestoneTitle: string) => {
    const t = byTitle(title);
    t.milestoneId = milestones.find((m) => m.title === milestoneTitle)!.id;
  };
  linkMilestone("Prepare Evolve Tennis Ladder tournament materials", "Participant packs dispatched");
  linkMilestone("Design tournament materials", "Participant packs dispatched");
  linkMilestone("Send ladder round 4 results", "Group stage ends");
  linkMilestone("Develop SportCraft website", "Website launch");
  tasks.forEach((t, i) => (t.projectSortOrder = (i + 1) * 1000));

  const weekdayOn = (offset: number) => parseISODate(d(offset)).getDay();
  const nextWeekday = (day: number) => Array.from({ length: 7 }, (_, i) => i).find((o) => weekdayOn(o) === day)!;
  const recurring = (input: RecurrenceInput) => ({
    ...createTemplate(input, at(-21, 9)),
    // Treat the past as already handled so the demo doesn't start with overdue repeats.
    generatedThrough: d(-1),
  });
  const recurrences = [
    recurring({ title: "Update SportCraft expenses", frequency: "weekly", interval: 1, intervalUnit: "days", selectedWeekdays: [5], startDate: d(nextWeekday(5) - 21), endDate: null, sprintId: "admin", projectId: "p_sportcraft", estimatedMinutes: 20 }),
    recurring({ title: "Review next week’s coaching schedule", frequency: "weekly", interval: 1, intervalUnit: "days", selectedWeekdays: [0], startDate: d(nextWeekday(0) - 21), endDate: null, sprintId: "admin", projectId: "p_coaching", estimatedMinutes: 15 }),
    recurring({ title: "Change bedsheets", frequency: "biweekly", interval: 1, intervalUnit: "days", selectedWeekdays: [weekdayOn(2)], startDate: d(2 - 14), endDate: null, sprintId: "admin", projectId: "p_life", estimatedMinutes: 15 }),
    recurring({ title: "Review personal finances", frequency: "monthly", interval: 1, intervalUnit: "days", selectedWeekdays: [], startDate: d(-25), endDate: null, sprintId: "admin", projectId: "p_life", estimatedMinutes: 30 }),
  ];

  // A few finished focus sessions (actual time differs from the plan).
  const session = (sprintId: SprintId, titles: string[], offset: number, planned: number, actual: number): SprintSession => {
    const s = createSession({ sprintId, taskIds: titles.map((t) => byTitle(t).id), plannedMinutes: planned, energyLevel: "moderate" }, at(offset, 9));
    const started = runSession(s, at(offset, 9));
    const ended = endSession({ ...started, status: "paused", accumulatedElapsedSeconds: actual * 60, lastResumedAt: null }, tasks, at(offset, 10));
    return { ...ended, endedAt: new Date(Date.parse(at(offset, 9)) + actual * 60_000).toISOString() };
  };
  const sessions = [
    session("build", ["Set up SportCraft product catalogue"], -3, 60, 70),
    session("admin", ["Restring two racquets", "Weekly grocery shop"], -2, 45, 50),
    session("build", ["Photograph new grip tape stock"], -2, 30, 40),
    session("deadlines", ["Prepare Evolve Tennis Ladder tournament materials"], -1, 45, 35),
    session("build", ["Edit coaching drill video"], -13, 60, 55),
  ];

  // Last week's review, finished, with its three priorities.
  const lastWeekReview = {
    ...createWeeklyReview(addDays(startOfWeekOf(d(0)), -7), at(-7, 19)),
    status: "completed" as const,
    wentWell: "Kept mornings for deep work. The product photos finally happened.",
    challenges: "Admin tasks kept taking longer than planned.",
    improvements: "Add buffer time to admin estimates.",
    lessonsLearned: "Batching errands on one afternoon saves a lot of back-and-forth.",
    nextWeekFocus: "Tournament prep and the website.",
    completedAt: at(-7, 20),
  };
  const priority = (title: string, sortOrder: number, link: Partial<WeeklyPriority>): WeeklyPriority => ({
    id: createId(),
    weeklyReviewId: lastWeekReview.id,
    taskId: null,
    projectId: null,
    title,
    sortOrder,
    createdAt: at(-7, 20),
    ...link,
  });
  const weeklyPriorities = [
    priority("Prepare Evolve Tennis Ladder tournament materials", 0, { taskId: byTitle("Prepare Evolve Tennis Ladder tournament materials").id }),
    priority("SportCraft OS", 1, { projectId: "p_sportcraft" }),
    priority("Rest properly on Sunday", 2, {}),
  ];

  // Three coaching students at different points on the ladder.
  const mia = createStudent({ name: "Mia", group: "junior", ball: "orange", hand: "right", backhand: "two", startedOn: d(-120), goals: "Rally from the baseline by the end of the year" }, at(-120, 16));
  const daniel = createStudent({ name: "Daniel", group: "adult", hand: "right", backhand: "two", startedOn: d(-180), goals: "Play doubles with friends; get the serve in" }, at(-180, 19));
  const ethan = createStudent({ name: "Ethan", group: "junior", ball: "yellow", hand: "left", backhand: "two", startedOn: d(-700), goals: "STA tournaments this season" }, at(-700, 17));
  const stage = (studentId: string, track: StudentStage["track"], id: string, offset: number, note = ""): StudentStage => ({
    id: createId(),
    studentId,
    track,
    stage: id,
    reachedOn: d(offset),
    note,
    createdAt: at(offset, 18),
    updatedAt: at(offset, 18),
  });
  const studentStages = [
    stage(mia.id, "rally", "R1", -110),
    stage(mia.id, "rally", "R2", -40, "10-ball rally on the short court"),
    stage(mia.id, "serve", "S1", -60),
    stage(mia.id, "match", "M1", -30),
    stage(daniel.id, "rally", "R3", -150),
    stage(daniel.id, "rally", "R4", -90),
    stage(daniel.id, "rally", "R5", -21, "20-ball baseline rally"),
    stage(daniel.id, "serve", "S1", -150),
    stage(daniel.id, "serve", "S2", -45),
    stage(daniel.id, "match", "M2", -60),
    stage(ethan.id, "rally", "R9", -200),
    stage(ethan.id, "serve", "S6", -90),
    stage(ethan.id, "net", "N4", -120),
    stage(ethan.id, "match", "M6", -150),
  ];
  const lesson = (studentId: string, offset: number, focus: string, wentWell: string, workOn: string) =>
    createLesson(studentId, { date: d(offset), focus, wentWell, workOn }, at(offset, 18));
  const studentLessons = [
    lesson(mia.id, -7, "Short court rally, reading the bounce", "Moved her feet better on the forehand", "Backhand: turn the shoulders earlier"),
    lesson(daniel.id, -3, "Serve from the service line", "Toss much more consistent", "Practise 20 tosses at home"),
    lesson(ethan.id, -2, "Second serve under pressure; match plan", "Kick serve held up in the practice set", "Return position against lefties"),
  ];

  // Ethan's recent matches (some with serve stats), and benchmark results over the last few months.
  const match = (offset: number, kind: "tournament" | "club" | "practice", event: string, result: "win" | "loss", score: string, stats: Partial<Record<"firstIn" | "firstTotal" | "doubleFaults" | "unforcedErrors" | "winners", number>> = {}) =>
    createMatch(
      ethan.id,
      {
        playedOn: d(offset),
        kind,
        event,
        opponent: "",
        result,
        score,
        firstIn: stats.firstIn ?? null,
        firstTotal: stats.firstTotal ?? null,
        secondIn: null,
        secondTotal: null,
        doubleFaults: stats.doubleFaults ?? null,
        unforcedErrors: stats.unforcedErrors ?? null,
        winners: stats.winners ?? null,
        notes: "",
        format: "singles",
        partner: "",
        rated: kind === "tournament",
        pointLosses: {},
        kapStats: {},
      },
      at(offset, 20),
    );
  const studentMatches = [
    match(-130, "club", "Club junior league", "win", "6-3 6-4"),
    match(-100, "tournament", "STA Junior Tour", "loss", "4-6 3-6", { firstIn: 28, firstTotal: 52, doubleFaults: 6 }),
    match(-72, "tournament", "STA Junior Tour", "win", "6-4 3-6 10-7", { firstIn: 35, firstTotal: 58, doubleFaults: 4, unforcedErrors: 21, winners: 12 }),
    match(-40, "club", "Club junior league", "win", "6-2 6-1"),
    match(-18, "tournament", "STA Junior Tour", "loss", "6-7 4-6", { firstIn: 37, firstTotal: 55, doubleFaults: 3 }),
    match(-6, "practice", "Practice set", "win", "6-3"),
  ];
  const builtin = (test: string) => BUILTIN_TESTS.find((t) => t.test === test)!;
  const result = (studentId: string, test: string, offset: number, value: number) => {
    const t = builtin(test);
    return createBenchmark(studentId, { test, name: t.name, unit: t.unit, higherIsBetter: t.higherIsBetter, value, measuredOn: d(offset), note: "" }, at(offset, 18));
  };
  const studentBenchmarks = [
    ...[[-120, 4], [-75, 7], [-40, 10], [-8, 12]].map(([o, v]) => result(mia.id, "rally_short", o, v)),
    ...[[-150, 6], [-110, 9], [-70, 14], [-35, 18], [-7, 22]].map(([o, v]) => result(daniel.id, "rally_baseline", o, v)),
    ...[[-90, 3], [-45, 4], [-10, 6]].map(([o, v]) => result(daniel.id, "first_serves", o, v)),
    ...[[-120, 6], [-60, 7], [-14, 7]].map(([o, v]) => result(ethan.id, "first_serves", o, v)),
    ...[[-120, 21.4], [-60, 20.1], [-14, 19.2]].map(([o, v]) =>
      createBenchmark(ethan.id, { test: customTestKey("Spider drill"), name: "Spider drill", unit: "seconds", higherIsBetter: false, value: v, measuredOn: d(o), note: "" }, at(o, 18)),
    ),
  ];

  // My Pickleball: your own profile, DUPR around 4.1, mostly doubles.
  const me = createStudent({ name: "Me", sport: "pickleball", isSelf: true }, at(-200, 9));
  const dupr = [
    ...[[-180, 3.86], [-120, 3.94], [-60, 4.03], [-10, 4.11]].map(([o, v]) => createRating(me.id, { kind: "doubles", rating: v, ratedOn: d(o), note: "" }, at(o, 21))),
    ...[[-150, 3.72], [-50, 3.95]].map(([o, v]) => createRating(me.id, { kind: "singles", rating: v, ratedOn: d(o), note: "" }, at(o, 21))),
  ];
  const pbMatch = (
    offset: number,
    partner: string,
    kind: "tournament" | "club" | "practice",
    result: "win" | "loss",
    score: string,
    notes: string,
    pointLosses: Record<string, number> = {},
    kapStats: Record<string, number> = {},
  ) =>
    createMatch(
      me.id,
      {
        playedOn: d(offset),
        kind,
        event: kind === "tournament" ? "4.0–4.5 open doubles" : "",
        opponent: "",
        result,
        score,
        firstIn: null,
        firstTotal: null,
        secondIn: null,
        secondTotal: null,
        doubleFaults: null,
        unforcedErrors: null,
        winners: null,
        notes,
        format: "doubles",
        partner,
        rated: kind !== "practice",
        pointLosses,
        kapStats,
      },
      at(offset, 21),
    );
  const myMatches = [
    pbMatch(-40, "Jess", "club", "win", "11-7 11-9", "We stacked so Jess's forehand stayed in the middle; worked well."),
    pbMatch(-26, "Jess", "tournament", "loss", "9-11 11-8 8-11", "Popped up resets against hard drives; lost the third game on speed-ups.", { reset: 5, speedup: 3, dink: 1 }, { drop_ok: 4, drop_miss: 6, drive_ok: 2, drive_miss: 3, third_err: 4, fifth_err: 3, seventh_err: 1 }),
    pbMatch(-19, "Wei", "club", "win", "11-5", "Wei covers the middle well — I can poach more.", { reset: 2, serve: 1 }),
    pbMatch(-9, "Jess", "tournament", "win", "11-9 7-11 11-6", "Patient dinking won us game three.", { reset: 3, third: 2, dink: 1 }, { drop_ok: 7, drop_miss: 4, drive_ok: 2, drive_miss: 2, third_err: 3, fifth_err: 2 }),
    pbMatch(-3, "Wei", "practice", "loss", "8-11", "Tried driving more third shots; too many errors.", { third: 4, reset: 1 }, { drop_ok: 2, drop_miss: 3, drive_ok: 1, drive_miss: 1, third_err: 2 }),
  ];
  const pb = (test: string, offset: number, value: number) => {
    const t = BUILTIN_TESTS.find((x) => x.test === test)!;
    return createBenchmark(me.id, { test, name: t.name, unit: t.unit, higherIsBetter: t.higherIsBetter, value, measuredOn: d(offset), note: "" }, at(offset, 19));
  };
  const myBenchmarks = [
    pb("pb_dink_rally", -60, 18),
    pb("pb_dink_rally", -14, 26),
    pb("pb_third_drop", -45, 5),
    pb("pb_third_drop", -12, 6),
    pb("pb_reset", -12, 4),
    pb("pb_deep_return", -12, 8),
  ];
  const myStages = [
    stage(me.id, "kitchen", "K1", -150),
    stage(me.id, "transition", "T1", -120),
    stage(me.id, "serve_return", "SR1", -150),
    stage(me.id, "serve_return", "SR2", -60),
    stage(me.id, "hands", "H1", -100),
    stage(me.id, "play", "P1", -180),
  ];

  return {
    studentRatings: dupr,
    studentMatches: [...studentMatches, ...myMatches],
    studentBenchmarks: [...studentBenchmarks, ...myBenchmarks],
    students: [mia, daniel, ethan, me],
    studentStages: [...studentStages, ...myStages],
    studentLessons: [
      ...studentLessons,
      createLesson(me.id, { date: d(-5), focus: "Reset drill: partner drives at my feet from mid-court", wentWell: "Soft hands on the backhand", workOn: "Paddle face too open on the forehand reset" }, at(-5, 20)),
    ],
    // One reworded stage (an extra milestone on R5) and a few milestones ticked.
    ladderStages: [
      {
        id: "rally:R5",
        track: "rally" as const,
        stage: "R5",
        name: "Baseline steady",
        focus: "Baseline, centre to centre",
        checks: [
          { id: "R5-1", text: "20-ball rally from the baseline" },
          { id: "R5-2", text: "Half the balls land past the service line" },
          { id: createId(), text: "Recovers to the centre mark after each shot" },
        ],
        createdAt: at(-30, 20),
        updatedAt: at(-30, 20),
      },
    ],
    studentChecks: [
      { id: createId(), studentId: daniel.id, track: "rally" as const, stage: "R5", checkId: "R5-1", doneOn: d(-7), createdAt: at(-7, 19), updatedAt: at(-7, 19) },
      { id: createId(), studentId: mia.id, track: "rally" as const, stage: "R2", checkId: "R2-1", doneOn: d(-7), createdAt: at(-7, 17), updatedAt: at(-7, 17) },
      { id: createId(), studentId: daniel.id, track: "serve" as const, stage: "S2", checkId: "S2-1", doneOn: d(-3), createdAt: at(-3, 19), updatedAt: at(-3, 19) },
    ],
    tasks,
    captures,
    sessions,
    highlights,
    commitments,
    commitmentCompletions,
    kaizenLogs,
    projects,
    milestones,
    recurrences,
    weeklyReviews: [lastWeekReview],
    weeklyPriorities,
  };
}
