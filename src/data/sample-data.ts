import { addDays, parseISODate } from "@/lib/date";
import { createCapture } from "@/lib/brain-dump/capture-model";
import { createTask } from "@/lib/tasks/task-model";
import type { Capture, CaptureInput, ISODate, PersistedData, Task, TaskInput } from "@/types";

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

  const tasks: Task[] = seeds.map(({ created, done, ...input }) => {
    const task = createTask(input, at(created, 9));
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

  return { tasks, captures };
}
