import { addDays, parseISODate } from "@/lib/date";
import type {
  CalendarEvent,
  CaptureItem,
  ISODate,
  KaizenEntry,
  MicroCommitment,
  Project,
  Task,
  Workspace,
} from "@/types";

/**
 * Sample data representing a realistic week in Belle's life.
 * Dates are generated relative to `today` so the demo always feels current.
 * Phase 2 replaces this with Supabase queries returning the same shapes.
 */
export function createMockWorkspace(today: ISODate): Workspace {
  const d = (offset: number) => addDays(today, offset);

  const projects: Project[] = [
    {
      id: "p_sportcraft",
      name: "SportCraft OS",
      description: "Website, product catalogue and day-to-day operations for SportCraft.",
      area: "Business",
      status: "active",
      targetDate: d(30),
    },
    {
      id: "p_ladder",
      name: "Evolve Tennis Ladder",
      description: "Season fixtures, results and the end-of-season tournament.",
      area: "Tennis Ladder",
      status: "active",
      targetDate: d(18),
    },
    {
      id: "p_coaching",
      name: "Tennis & Pickleball Coaching",
      description: "Students, clinics, scheduling and lesson planning.",
      area: "Coaching",
      status: "active",
      targetDate: null,
    },
    {
      id: "p_life",
      name: "Personal Life Management",
      description: "Home, admin, health and the everyday essentials.",
      area: "Personal",
      status: "active",
      targetDate: null,
    },
  ];

  type Seed = Omit<Task, "actualMinutes" | "completedDate" | "notes"> &
    Partial<Pick<Task, "actualMinutes" | "completedDate" | "notes">>;

  const seeds: Seed[] = [
    // Sprint 1 — Urgent
    { id: "t_enquiry", title: "Reply to urgent customer enquiry", sprintId: "urgent", projectId: "p_sportcraft", status: "todo", plannedDate: d(0), dueDate: d(0), estimateMinutes: 15 },
    { id: "t_court", title: "Confirm court booking for Saturday clinic", sprintId: "urgent", projectId: "p_coaching", status: "done", plannedDate: d(0), dueDate: d(0), estimateMinutes: 10, actualMinutes: 8, completedDate: d(0) },
    { id: "t_invoice", title: "Pay court hire invoice", sprintId: "urgent", projectId: "p_coaching", status: "todo", plannedDate: d(1), dueDate: d(1), estimateMinutes: 10 },

    // Sprint 2 — Deadlines
    { id: "t_ladder_materials", title: "Prepare Evolve Tennis Ladder tournament materials", sprintId: "deadlines", projectId: "p_ladder", status: "in_progress", plannedDate: d(0), dueDate: d(3), estimateMinutes: 90, notes: "Draw sheets, rules summary, prize list." },
    { id: "t_ladder_results", title: "Send ladder round 4 results", sprintId: "deadlines", projectId: "p_ladder", status: "todo", plannedDate: d(1), dueDate: d(2), estimateMinutes: 30 },
    { id: "t_supplier", title: "Finalise SportCraft supplier order", sprintId: "deadlines", projectId: "p_sportcraft", status: "todo", plannedDate: d(2), dueDate: d(5), estimateMinutes: 45 },

    // Sprint 3 — Admin & Life
    { id: "t_schedule", title: "Schedule next week’s tennis students", sprintId: "admin", projectId: "p_coaching", status: "todo", plannedDate: d(0), dueDate: d(1), estimateMinutes: 30 },
    { id: "t_expenses", title: "Update expenses", sprintId: "admin", projectId: "p_life", status: "todo", plannedDate: d(0), dueDate: null, estimateMinutes: 20 },
    { id: "t_bedsheets", title: "Change bedsheets", sprintId: "admin", projectId: "p_life", status: "done", plannedDate: d(0), dueDate: null, estimateMinutes: 15, actualMinutes: 15, completedDate: d(0) },
    { id: "t_parents", title: "Reply to parent emails about lesson times", sprintId: "admin", projectId: "p_coaching", status: "done", plannedDate: d(0), dueDate: null, estimateMinutes: 20, actualMinutes: 25, completedDate: d(0) },
    { id: "t_vet", title: "Book the dog’s vet check-up", sprintId: "admin", projectId: "p_life", status: "todo", plannedDate: d(-1), dueDate: d(6), estimateMinutes: 10 },

    // Sprint 4 — Build & Create
    { id: "t_website", title: "Develop SportCraft website", sprintId: "build", projectId: "p_sportcraft", status: "in_progress", plannedDate: d(0), dueDate: d(21), estimateMinutes: 120 },
    { id: "t_design", title: "Design tournament materials", sprintId: "build", projectId: "p_ladder", status: "todo", plannedDate: d(1), dueDate: d(4), estimateMinutes: 60 },
    { id: "t_clinic", title: "Plan a new pickleball clinic", sprintId: "build", projectId: "p_coaching", status: "todo", plannedDate: d(2), dueDate: null, estimateMinutes: 45 },
    { id: "t_descriptions", title: "Write product descriptions for new paddles", sprintId: "build", projectId: "p_sportcraft", status: "todo", plannedDate: null, dueDate: null, estimateMinutes: 40 },

    // Recently completed — feeds progress and Time Estimation
    { id: "t_catalogue", title: "Set up SportCraft product catalogue", sprintId: "build", projectId: "p_sportcraft", status: "done", plannedDate: d(-3), dueDate: null, estimateMinutes: 60, actualMinutes: 95, completedDate: d(-3) },
    { id: "t_rules", title: "Draft ladder rules document", sprintId: "deadlines", projectId: "p_ladder", status: "done", plannedDate: d(-5), dueDate: d(-4), estimateMinutes: 45, actualMinutes: 40, completedDate: d(-5) },
    { id: "t_restring", title: "Restring two racquets", sprintId: "admin", projectId: "p_coaching", status: "done", plannedDate: d(-2), dueDate: null, estimateMinutes: 30, actualMinutes: 50, completedDate: d(-2) },
    { id: "t_groceries", title: "Weekly grocery shop", sprintId: "admin", projectId: "p_life", status: "done", plannedDate: d(-1), dueDate: null, estimateMinutes: 45, actualMinutes: 60, completedDate: d(-1) },
    { id: "t_availability", title: "Update coaching availability online", sprintId: "admin", projectId: "p_coaching", status: "done", plannedDate: d(-4), dueDate: null, estimateMinutes: 15, actualMinutes: 10, completedDate: d(-4) },
    { id: "t_signup", title: "Create ladder player sign-up form", sprintId: "build", projectId: "p_ladder", status: "done", plannedDate: d(-6), dueDate: null, estimateMinutes: 30, actualMinutes: 35, completedDate: d(-6) },
    { id: "t_photos", title: "Photograph new grip tape stock", sprintId: "build", projectId: "p_sportcraft", status: "done", plannedDate: d(-2), dueDate: null, estimateMinutes: 30, actualMinutes: 45, completedDate: d(-2) },
    { id: "t_meals", title: "Plan meals for the week", sprintId: "admin", projectId: "p_life", status: "done", plannedDate: d(-6), dueDate: null, estimateMinutes: 20, actualMinutes: 15, completedDate: d(-6) },
    { id: "t_balls", title: "Reorder coaching balls", sprintId: "urgent", projectId: "p_coaching", status: "done", plannedDate: d(-1), dueDate: d(-1), estimateMinutes: 10, actualMinutes: 10, completedDate: d(-1) },
  ];

  const tasks: Task[] = seeds.map((s) => ({
    actualMinutes: null,
    completedDate: null,
    ...s,
  }));

  // Spread each commitment across the past fortnight so the indicators look lived-in.
  const pattern = (offsets: number[]) => offsets.map((o) => d(-o));
  const commitments: MicroCommitment[] = [
    {
      id: "c_reset",
      title: "10-minute home reset",
      description: "Set a timer. Reset one space. Stop when it rings.",
      cue: "Before dinner",
      completedDates: pattern([1, 2, 4, 5, 6, 8, 9, 11]),
    },
    {
      id: "c_read",
      title: "Read 5 pages",
      description: "Any book counts. Five pages is enough.",
      cue: "With morning coffee",
      completedDates: pattern([0, 1, 2, 3, 5, 6, 7, 9, 10]),
    },
    {
      id: "c_shutdown",
      title: "Midnight shutdown routine",
      description: "Screens off, tomorrow’s highlight chosen, lights out.",
      cue: "From 11:30 pm",
      completedDates: pattern([1, 3, 4, 7, 8]),
    },
  ];

  const captures: CaptureItem[] = [
    { id: "b_strings", text: "Order tennis strings", kind: "task", capturedDate: d(0), processed: false },
    { id: "b_dogfood", text: "Buy dog food", kind: "reminder", capturedDate: d(0), processed: false },
    { id: "b_prices", text: "Update SportCraft product prices", kind: "task", capturedDate: d(0), processed: false },
    { id: "b_mirror", text: "Clean bathroom mirror", kind: "task", capturedDate: d(-1), processed: false },
    { id: "b_roundrobin", text: "Doubles round-robin social night for ladder players?", kind: "idea", capturedDate: d(-1), processed: false },
    { id: "b_squad", text: "Ask Sam about junior squad times for next term", kind: "reminder", capturedDate: d(-2), processed: false },
    { id: "b_newsletter", text: "Monthly SportCraft newsletter — new arrivals + coaching tips", kind: "idea", capturedDate: d(-2), processed: false },
    { id: "b_quote", text: "“Small steps every day.” — pin above desk", kind: "note", capturedDate: d(-3), processed: false },
    { id: "b_membership", text: "Renew club membership", kind: "task", capturedDate: d(-4), processed: true },
  ];

  return {
    today,
    highlightTaskId: "t_schedule",
    tasks,
    projects,
    commitments,
    captures,
    events: createEvents(today),
    kaizenEntries: createKaizenEntries(today),
    weeklyReview: {
      id: "w_current",
      weekStart: addDays(today, -6),
      wins: [
        "Got the SportCraft product catalogue live",
        "Kept the morning reading habit going most days",
        "Ladder sign-up form is working — 24 players registered",
      ],
      challenges: [
        "Admin tasks piled up mid-week after back-to-back coaching days",
        "Underestimated how long photography and restringing take",
      ],
      lessons:
        "Batching admin into one short sprint after lunch works better than squeezing it between lessons.",
      nextWeekPriorities: [
        "Finish Evolve Tennis Ladder tournament materials",
        "Ship the first version of the SportCraft website",
        "Plan the new pickleball clinic",
      ],
    },
  };
}

function createEvents(today: ISODate): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  // Recurring weekly coaching pattern across roughly six weeks around today.
  for (let offset = -21; offset <= 28; offset++) {
    const date = addDays(today, offset);
    const weekday = parseISODate(date).getDay();
    const add = (title: string, start: string, end: string, kind: CalendarEvent["kind"]) =>
      events.push({ id: `e_${date}_${start}_${kind}`, title, date, start, end, kind });

    if (weekday === 1 || weekday === 3) add("Junior squad", "16:00", "17:30", "coaching");
    if (weekday === 2 || weekday === 4) add("Adult pickleball clinic", "18:00", "19:30", "coaching");
    if (weekday === 5) add("Private lessons", "15:00", "18:00", "coaching");
    if (weekday === 6) add("Evolve Ladder matches", "09:00", "12:00", "ladder");
  }

  const oneOffs: Omit<CalendarEvent, "id">[] = [
    { title: "SportCraft supplier call", date: addDays(today, 1), start: "10:00", end: "10:30", kind: "business" },
    { title: "Vet check-up", date: addDays(today, 6), start: "11:00", end: "11:30", kind: "personal" },
    { title: "Ladder tournament day", date: addDays(today, 18), start: "08:30", end: "16:00", kind: "ladder" },
    { title: "Website review", date: addDays(today, 9), start: "13:00", end: "14:00", kind: "business" },
    { title: "Dinner with friends", date: addDays(today, 3), start: "19:30", end: "21:30", kind: "personal" },
  ];
  oneOffs.forEach((e, i) => events.push({ id: `e_oneoff_${i}`, ...e }));

  return events.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
}

function createKaizenEntries(today: ISODate): KaizenEntry[] {
  const d = (offset: number) => addDays(today, offset);
  return [
    {
      id: "k_today",
      date: d(0),
      highlight: "Schedule next week’s tennis students",
      highlightDone: false,
      brainDump: ["Order tennis strings", "Buy dog food", "Update SportCraft product prices"],
      commitments: [
        { title: "10-minute home reset", done: false },
        { title: "Read 5 pages", done: true },
        { title: "Midnight shutdown routine", done: false },
      ],
      reflection: { wentWell: "", improve: "", oneSmallStep: "" },
      energy: 3,
    },
    {
      id: "k_yesterday",
      date: d(-1),
      highlight: "Finish grocery shop and meal prep",
      highlightDone: true,
      brainDump: ["Clean bathroom mirror", "Doubles round-robin idea", "Reorder coaching balls"],
      commitments: [
        { title: "10-minute home reset", done: true },
        { title: "Read 5 pages", done: true },
        { title: "Midnight shutdown routine", done: true },
      ],
      reflection: {
        wentWell: "Did the shop straight after morning lessons — no decision fatigue later.",
        improve: "Started the evening scrolling instead of the shutdown routine.",
        oneSmallStep: "Phone on charge in the kitchen at 11:30.",
      },
      energy: 4,
    },
    {
      id: "k_2",
      date: d(-2),
      highlight: "Photograph new grip tape stock",
      highlightDone: true,
      brainDump: ["Ask Sam about junior squad times", "SportCraft newsletter idea"],
      commitments: [
        { title: "10-minute home reset", done: true },
        { title: "Read 5 pages", done: true },
        { title: "Midnight shutdown routine", done: false },
      ],
      reflection: {
        wentWell: "Photos look great and are ready for the website.",
        improve: "It took 45 minutes, not 30 — light setup takes time.",
        oneSmallStep: "Leave the lightbox set up for next time.",
      },
      energy: 3,
    },
    {
      id: "k_3",
      date: d(-3),
      highlight: "Set up SportCraft product catalogue",
      highlightDone: true,
      brainDump: ["Pin ‘small steps’ quote above desk"],
      commitments: [
        { title: "10-minute home reset", done: false },
        { title: "Read 5 pages", done: true },
        { title: "Midnight shutdown routine", done: true },
      ],
      reflection: {
        wentWell: "Deep work in the morning before lessons was really productive.",
        improve: "Ran over time and rushed lunch.",
        oneSmallStep: "Set a 90-minute timer for deep work blocks.",
      },
      energy: 2,
    },
  ];
}
