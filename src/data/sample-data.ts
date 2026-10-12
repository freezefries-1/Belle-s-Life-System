import { addDays, parseISODate } from "@/lib/date";
import { createCapture } from "@/lib/brain-dump/capture-model";
import { createCommitment } from "@/lib/daily/commitments";
import { createHighlight, createLog } from "@/lib/daily/day";
import { createId } from "@/lib/id";
import { createTask } from "@/lib/tasks/task-model";
import type {
  Capture,
  CaptureInput,
  CommitmentCompletion,
  DailyHighlight,
  ISODate,
  KaizenLog,
  PersistedData,
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
    { title: "Change bedsheets", sprint: "admin", projectId: "p_life", dueDate: d(0), estimatedMinutes: 15, actualMinutes: 15, status: "completed", created: -1, done: 0 },
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

  return { tasks, captures, sessions: [], highlights, commitments, commitmentCompletions, kaizenLogs };
}
